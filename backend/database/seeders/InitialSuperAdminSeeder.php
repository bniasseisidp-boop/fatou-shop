<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use RuntimeException;

class InitialSuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        $email = Str::lower(trim((string) env('SUPERADMIN_EMAIL')));
        $password = (string) env('SUPERADMIN_PASSWORD');

        if ($email === '' && $password === '') {
            $this->command?->warn('SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD are unset; no superadmin account was created.');
            return;
        }

        if (! filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 14) {
            throw new RuntimeException(
                'Configure a valid SUPERADMIN_EMAIL and a SUPERADMIN_PASSWORD of at least 14 characters.',
            );
        }

        $name = trim((string) env('SUPERADMIN_NAME', 'Superadministrateur Fatou Shop'));
        $user = User::query()->where('email', $email)->first();

        if ($user && ! $user->is_admin) {
            throw new RuntimeException('SUPERADMIN_EMAIL already belongs to a non-admin account.');
        }

        User::updateOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'password' => Hash::make($password),
                'is_admin' => true,
                'is_superadmin' => true,
                'admin_active' => true,
            ],
        );
    }
}
