<?php

declare(strict_types=1);

function profile_payload(array $user): array
{
    return [
        'id' => (string) $user['id'],
        'email' => (string) $user['email'],
        'fullName' => (string) ($user['full_name'] ?? ''),
        'jobTitle' => (string) ($user['job_title'] ?? ''),
        'department' => (string) ($user['department'] ?? ''),
        'phone' => (string) ($user['phone'] ?? ''),
        'avatar' => is_string($user['avatar_data'] ?? null) ? $user['avatar_data'] : null,
    ];
}

function get_profile(string $userId): array
{
    $statement = database()->prepare(
        'SELECT id, email, full_name, job_title, department, phone, avatar_data
         FROM app_users WHERE id = :id LIMIT 1'
    );
    $statement->execute(['id' => $userId]);
    $profile = $statement->fetch();
    if (!$profile) {
        json_response(['error' => 'Profile not found.'], 404);
    }
    return ['profile' => profile_payload($profile)];
}

function update_profile(string $userId, array $body): array
{
    $fullName = trim((string) ($body['fullName'] ?? ''));
    $jobTitle = trim((string) ($body['jobTitle'] ?? ''));
    $department = trim((string) ($body['department'] ?? ''));
    $phone = trim((string) ($body['phone'] ?? ''));
    $avatar = $body['avatar'] ?? null;

    if ($fullName === '' || mb_strlen($fullName) > 160) {
        json_response(['error' => 'Enter a full name of up to 160 characters.'], 422);
    }
    if (mb_strlen($jobTitle) > 120 || mb_strlen($department) > 120 || mb_strlen($phone) > 40) {
        json_response(['error' => 'One or more profile fields are too long.'], 422);
    }
    if ($avatar !== null) {
        if (!is_string($avatar) || preg_match('#^data:image/(?:png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$#', $avatar, $matches) !== 1) {
            json_response(['error' => 'Use a valid PNG, JPG, or WebP profile image.'], 422);
        }
        $decodedAvatar = base64_decode($matches[1], true);
        if ($decodedAvatar === false || strlen($decodedAvatar) > 350000) {
            json_response(['error' => 'Use a PNG, JPG, or WebP profile image smaller than 350 KB.'], 422);
        }
    }

    database()->prepare(
        'UPDATE app_users SET full_name = :full_name, job_title = :job_title,
         department = :department, phone = :phone, avatar_data = :avatar
         WHERE id = :id'
    )->execute([
        'full_name' => $fullName,
        'job_title' => $jobTitle,
        'department' => $department,
        'phone' => $phone,
        'avatar' => $avatar,
        'id' => $userId,
    ]);
    return get_profile($userId);
}
