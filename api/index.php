<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

try {
    $user = authenticated_user();
    ensure_application_user($user);
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    $path = parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/api'), PHP_URL_PATH) ?: '/api';
    $path = preg_replace('#^/api(?:/index\.php)?#', '', $path) ?? '';
    $segments = array_values(array_filter(explode('/', trim($path, '/')), static fn ($part) => $part !== ''));

    if (($segments[0] ?? '') !== 'plans') {
        json_response(['error' => 'API route not found.'], 404);
    }

    $planId = $segments[1] ?? null;
    if ($planId !== null && !valid_uuid($planId)) {
        json_response(['error' => 'Plan not found.'], 404);
    }

    if ($planId === null && $method === 'GET') {
        $archived = ($_GET['archived'] ?? '') === 'true';
        $defaultLimit = $archived ? 20 : 8;
        $limit = min(max((int) ($_GET['limit'] ?? $defaultLimit), 1), 50);
        $archiveClause = $archived ? 'archived_at IS NOT NULL' : 'archived_at IS NULL';
        $statement = database()->prepare(
            "SELECT id, title, role, duration_weeks, updated_at, plan_json
             FROM onboarding_plans
             WHERE owner_id = :owner_id AND {$archiveClause}
             ORDER BY updated_at DESC
             LIMIT :plan_limit"
        );
        $statement->bindValue(':owner_id', $user['id']);
        $statement->bindValue(':plan_limit', $limit, PDO::PARAM_INT);
        $statement->execute();
        json_response(['plans' => array_map('saved_plan', $statement->fetchAll())]);
    }

    if ($planId === null && $method === 'POST') {
        $body = request_json();
        $plan = normalized_plan($body['plan'] ?? null);
        if ($plan === null) {
            json_response(['error' => 'A valid onboarding plan is required.'], 400);
        }

        $id = uuid_v4();
        $role = $plan['role'];
        $weeks = (int) $plan['nWeeks'];
        $reports = trim((string) ($plan['reportsTo'] ?? $plan['reports'] ?? ''));
        $collaborates = trim((string) ($plan['collaboratesWith'] ?? $plan['collab'] ?? ''));
        $statement = database()->prepare(
            'INSERT INTO onboarding_plans
             (id, owner_id, title, role, reports_to, collaborates_with, duration_weeks, plan_json)
             VALUES (:id, :owner_id, :title, :role, :reports_to, :collaborates_with, :weeks, :plan_json)'
        );
        $statement->execute([
            'id' => $id,
            'owner_id' => $user['id'],
            'title' => $role,
            'role' => $role,
            'reports_to' => mb_substr($reports, 0, 160),
            'collaborates_with' => mb_substr($collaborates, 0, 255),
            'weeks' => $weeks,
            'plan_json' => json_encode($plan, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
        ]);
        $planId = $id;
        $method = 'GET_CREATED';
    }

    if ($planId !== null && in_array($method, ['GET', 'GET_CREATED'], true)) {
        $statement = database()->prepare(
            'SELECT id, title, role, duration_weeks, updated_at, plan_json
             FROM onboarding_plans
             WHERE id = :id AND owner_id = :owner_id
             LIMIT 1'
        );
        $statement->execute(['id' => $planId, 'owner_id' => $user['id']]);
        $row = $statement->fetch();
        if (!$row) {
            json_response(['error' => 'Plan not found.'], 404);
        }
        json_response(['plan' => saved_plan($row)], $method === 'GET_CREATED' ? 201 : 200);
    }

    if ($planId !== null && $method === 'PATCH') {
        $body = request_json();
        $action = $body['action'] ?? null;
        if ($action === 'archive' || $action === 'restore') {
            $statement = database()->prepare(
                'UPDATE onboarding_plans
                 SET archived_at = :archived_at, updated_at = CURRENT_TIMESTAMP(3)
                 WHERE id = :id AND owner_id = :owner_id'
            );
            $statement->execute([
                'archived_at' => $action === 'archive' ? gmdate('Y-m-d H:i:s.v') : null,
                'id' => $planId,
                'owner_id' => $user['id'],
            ]);
            if ($statement->rowCount() === 0) {
                $exists = database()->prepare(
                    'SELECT 1 FROM onboarding_plans WHERE id = :id AND owner_id = :owner_id'
                );
                $exists->execute(['id' => $planId, 'owner_id' => $user['id']]);
                if (!$exists->fetchColumn()) {
                    json_response(['error' => 'Plan not found.'], 404);
                }
            }
            json_response(['ok' => true]);
        }

        $plan = normalized_plan($body['plan'] ?? null);
        if ($plan === null) {
            json_response(['error' => 'A valid action or onboarding plan is required.'], 400);
        }
        $role = $plan['role'];
        $reports = trim((string) ($plan['reportsTo'] ?? $plan['reports'] ?? ''));
        $collaborates = trim((string) ($plan['collaboratesWith'] ?? $plan['collab'] ?? ''));
        $statement = database()->prepare(
            'UPDATE onboarding_plans
             SET title = :title, role = :role, reports_to = :reports_to,
                 collaborates_with = :collaborates_with, duration_weeks = :weeks,
                 plan_json = :plan_json, updated_at = CURRENT_TIMESTAMP(3)
             WHERE id = :id AND owner_id = :owner_id'
        );
        $statement->execute([
            'title' => $role,
            'role' => $role,
            'reports_to' => mb_substr($reports, 0, 160),
            'collaborates_with' => mb_substr($collaborates, 0, 255),
            'weeks' => (int) $plan['nWeeks'],
            'plan_json' => json_encode($plan, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
            'id' => $planId,
            'owner_id' => $user['id'],
        ]);
        if ($statement->rowCount() === 0) {
            $exists = database()->prepare('SELECT 1 FROM onboarding_plans WHERE id = :id AND owner_id = :owner_id');
            $exists->execute(['id' => $planId, 'owner_id' => $user['id']]);
            if (!$exists->fetchColumn()) {
                json_response(['error' => 'Plan not found.'], 404);
            }
        }
        $method = 'GET';
    }

    if ($planId !== null && $method === 'DELETE') {
        $statement = database()->prepare(
            'DELETE FROM onboarding_plans WHERE id = :id AND owner_id = :owner_id'
        );
        $statement->execute(['id' => $planId, 'owner_id' => $user['id']]);
        if ($statement->rowCount() === 0) {
            json_response(['error' => 'Plan not found.'], 404);
        }
        json_response(['ok' => true]);
    }

    if ($planId !== null && $method === 'GET') {
        $statement = database()->prepare(
            'SELECT id, title, role, duration_weeks, updated_at, plan_json
             FROM onboarding_plans WHERE id = :id AND owner_id = :owner_id LIMIT 1'
        );
        $statement->execute(['id' => $planId, 'owner_id' => $user['id']]);
        $row = $statement->fetch();
        if (!$row) {
            json_response(['error' => 'Plan not found.'], 404);
        }
        json_response(['plan' => saved_plan($row)]);
    }

    json_response(['error' => 'Method not allowed.'], 405);
} catch (Throwable $error) {
    error_log('OakBoard API failure: ' . $error->getMessage());
    json_response(['error' => 'OakBoard could not complete this request.'], 500);
}
