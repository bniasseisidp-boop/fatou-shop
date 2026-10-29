<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\InitialAdminSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SuperAdminTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_superadmins_can_access_the_control_panel(): void
    {
        $admin = $this->createAdmin();
        $superadmin = $this->createAdmin(['is_superadmin' => true]);

        $this->actingAs($admin)->getJson('/api/superadmin/dashboard')->assertForbidden();
        $this->actingAs($superadmin)->getJson('/api/superadmin/dashboard')->assertOk();
    }

    public function test_superadmin_can_create_and_suspend_an_admin(): void
    {
        $superadmin = $this->createAdmin(['is_superadmin' => true]);

        $response = $this->actingAs($superadmin)->postJson('/api/superadmin/admins', [
            'name' => 'Équipe boutique',
            'email' => 'equipe@example.test',
            'password' => 'temporary-secret-123',
            'password_confirmation' => 'temporary-secret-123',
        ]);

        $response->assertCreated()
            ->assertJsonPath('admin.email', 'equipe@example.test')
            ->assertJsonPath('admin.admin_active', true);

        $admin = User::where('email', 'equipe@example.test')->firstOrFail();
        $this->assertTrue($admin->is_admin);
        $this->assertFalse($admin->is_superadmin);
        $this->assertTrue(Hash::check('temporary-secret-123', $admin->password));

        $this->patchJson("/api/superadmin/admins/{$admin->id}", ['admin_active' => false])
            ->assertOk()
            ->assertJsonPath('admin.admin_active', false);

        $this->postJson('/api/admin/login', [
            'email' => 'equipe@example.test',
            'password' => 'temporary-secret-123',
        ])->assertUnprocessable();
    }

    public function test_initial_admin_seeder_can_be_skipped_without_credentials(): void
    {
        $previousValues = [];

        foreach (['ADMIN_EMAIL', 'ADMIN_PASSWORD'] as $name) {
            $previousValues[$name] = [
                'environment' => getenv($name),
                'server' => $_SERVER[$name] ?? null,
                'server_exists' => array_key_exists($name, $_SERVER),
                'env' => $_ENV[$name] ?? null,
                'env_exists' => array_key_exists($name, $_ENV),
            ];
            putenv($name);
            unset($_SERVER[$name], $_ENV[$name]);
        }

        try {
            app(InitialAdminSeeder::class)->run();
        } finally {
            foreach ($previousValues as $name => $values) {
                if ($values['environment'] !== false) {
                    putenv($name.'='.$values['environment']);
                }
                if ($values['server_exists']) {
                    $_SERVER[$name] = $values['server'];
                }
                if ($values['env_exists']) {
                    $_ENV[$name] = $values['env'];
                }
            }
        }

        $this->assertDatabaseCount('users', 0);
    }

    public function test_regular_admins_cannot_manage_admin_accounts_or_read_audit_logs(): void
    {
        $admin = $this->createAdmin();

        $this->actingAs($admin)
            ->getJson('/api/superadmin/admins')
            ->assertForbidden();

        $this->actingAs($admin)
            ->getJson('/api/superadmin/activity')
            ->assertForbidden();
    }

    public function test_admin_activity_is_recorded_without_request_payloads(): void
    {
        $superadmin = $this->createAdmin(['is_superadmin' => true]);
        $this->actingAs($superadmin)
            ->postJson('/api/superadmin/admins', [
                'name' => 'Nouveau compte',
                'email' => 'nouveau@example.test',
                'password' => 'temporary-secret-456',
                'password_confirmation' => 'temporary-secret-456',
            ])
            ->assertCreated();

        $this->assertDatabaseHas('admin_activity', [
            'user_id' => $superadmin->id,
            'action' => 'api.superadmin.admins.store',
            'method' => 'POST',
            'path' => 'api/superadmin/admins',
            'status' => 201,
        ]);
        $this->assertDatabaseCount('admin_activity', 1);
    }

    public function test_superadmin_login_attempts_are_audited(): void
    {
        $this->postJson('/api/superadmin/login', [
            'email' => 'unknown@example.test',
            'password' => 'wrong-password',
        ])->assertUnprocessable();

        $this->assertDatabaseHas('admin_activity', [
            'actor_label' => 'unknown@example.test',
            'action' => 'superadmin.login.failed',
            'method' => 'POST',
            'status' => 422,
        ]);
    }

    public function test_superadmin_can_log_in_and_successful_login_is_audited(): void
    {
        $superadmin = $this->createAdmin([
            'is_superadmin' => true,
            'password' => 'a-strong-test-password',
        ]);

        $this->postJson('/api/superadmin/login', [
            'email' => $superadmin->email,
            'password' => 'a-strong-test-password',
        ])
            ->assertOk()
            ->assertJsonPath('user.email', $superadmin->email);

        $this->assertDatabaseHas('admin_activity', [
            'user_id' => $superadmin->id,
            'actor_label' => $superadmin->email,
            'action' => 'superadmin.login.succeeded',
            'method' => 'POST',
            'status' => 200,
        ]);
    }

    private function createAdmin(array $attributes = []): User
    {
        return User::create(array_merge([
            'name' => 'Boutique Admin',
            'email' => fake()->unique()->safeEmail(),
            'password' => 'a-strong-test-password',
            'is_admin' => true,
            'is_superadmin' => false,
            'admin_active' => true,
        ], $attributes));
    }
}
