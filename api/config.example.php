<?php

declare(strict_types=1);

// Copy this file to /home/CPANEL_USER/oakboard-config.php and chmod it to 600.
// Never place the real file inside public_html or commit real credentials.
return [
    'mysql' => [
        'host' => 'localhost',
        'port' => 3306,
        'database' => 'cpanelprefix_oakboard',
        'username' => 'cpanelprefix_oakboard_user',
        'password' => 'replace_with_a_private_password',
    ],
    'supabase' => [
        'url' => 'https://your-project.supabase.co',
        'publishable_key' => 'your_supabase_publishable_key',
    ],
];
