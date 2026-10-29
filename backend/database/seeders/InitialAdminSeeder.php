<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use RuntimeException;

class InitialAdminSeeder extends Seeder
{
    public function run(): void
    {
        $email = Str::lower(trim((string) env('ADMIN_EMAIL')));
        $password = (string) env('ADMIN_PASSWORD');
        $name = trim((string) env('ADMIN_NAME', 'Administrateur Fatou Shop'));

        if ($email === '' && $password === '') {
            $this->command?->warn('ADMIN_EMAIL and ADMIN_PASSWORD are unset; no initial admin account was created.');
            return;
        }

        if (! filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 14) {
            throw new RuntimeException(
                'Configure ADMIN_EMAIL and an ADMIN_PASSWORD of at least 14 characters before seeding the first admin.',
            );
        }

        User::updateOrCreate(
            ['email' => $email],
            ['name' => $name, 'password' => Hash::make($password), 'is_admin' => true],
        );
    }
}
