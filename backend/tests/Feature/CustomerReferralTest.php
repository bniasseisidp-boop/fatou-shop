<?php

namespace Tests\Feature;

use App\Models\DeliveryZone;
use App\Models\CustomerAnnouncement;
use App\Models\OrderItem;
use App\Models\Order;
use App\Models\Product;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CustomerReferralTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_can_register_with_an_invitation_code_and_log_in_by_phone(): void
    {
        $referrer = $this->createCustomer([
            'phone' => '781234567',
            'referral_code' => 'FATOU123',
        ]);

        $this->postJson('/api/client/register', [
            'name' => 'Aïssatou Ndiaye',
            'phone' => '+221 77 123 45 67',
            'password' => 'customer-password-2026',
            'password_confirmation' => 'customer-password-2026',
            'referral_code' => 'fatou123',
        ])->assertCreated()
            ->assertJsonPath('user.phone', '771234567')
            ->assertJsonStructure(['user' => ['referral_code']]);

        $customer = User::query()->where('phone', '771234567')->firstOrFail();
        $this->assertSame(8, strlen($customer->referral_code));
        $this->assertSame($referrer->id, $customer->referred_by_user_id);

        $this->postJson('/api/client/logout')->assertOk();
        $this->postJson('/api/client/login', [
            'phone' => '77 123 45 67',
            'password' => 'customer-password-2026',
        ])->assertOk()->assertJsonPath('user.id', $customer->id);
    }

    public function test_customer_dashboard_shows_only_the_authenticated_customers_history(): void
    {
        Storage::fake('local');
        Storage::disk('local')->put('payment-proofs/test.png', 'proof');
        $customer = $this->createCustomer();
        $otherCustomer = $this->createCustomer(['phone' => '761234567', 'referral_code' => 'OTHER123']);
        $customerOrder = $this->createOrder($customer);
        $this->createOrder($otherCustomer, ['reference' => 'FS-OTHER-000001']);

        $this->actingAs($customer)
            ->getJson('/api/client/dashboard')
            ->assertOk()
            ->assertJsonPath('metrics.orders_count', 1)
            ->assertJsonPath('metrics.amount_paid', 11500)
            ->assertJsonPath('metrics.amount_paid_this_week', 11500)
            ->assertJsonPath('metrics.amount_paid_this_month', 11500)
            ->assertJsonCount(1, 'orders');
        $this->getJson("/api/client/orders/{$customerOrder->id}/proof")->assertOk();
        $this->actingAs($otherCustomer)->getJson("/api/client/orders/{$customerOrder->id}/proof")->assertNotFound();

        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin@example.test',
            'password' => 'another-secure-password',
            'is_admin' => true,
        ]);
        $this->actingAs($admin)->getJson('/api/client/dashboard')->assertForbidden();
    }

    public function test_available_referral_reward_is_calculated_and_used_by_the_server(): void
    {
        $customer = $this->createCustomer([
            'referral_reward_earned_at' => now(),
        ]);
        $product = $this->createProduct();
        $zone = DeliveryZone::create(['name' => 'Dieuppeul-Derklé', 'fee' => 1500, 'active' => true]);

        $response = $this->actingAs($customer)->postJson('/api/orders', [
            'customer_name' => $customer->name,
            'customer_phone' => $customer->phone,
            'delivery_zone_id' => $zone->id,
            'delivery_address' => 'Près de la pharmacie',
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
        ]);

        $response->assertCreated()
            ->assertJsonPath('order.referral_discount_amount', 500)
            ->assertJsonPath('order.total', 11000);

        $order = Order::query()->firstOrFail();
        $this->assertSame($customer->id, $order->user_id);
        $this->assertSame(500, $order->referral_discount_amount);
        $this->assertNotNull($customer->fresh()->referral_reward_used_at);
    }

    public function test_an_invitation_is_qualified_once_when_the_referred_customers_order_is_delivered(): void
    {
        Storage::fake('local');
        Setting::updateOrCreate(['key' => 'referral'], ['value' => ['threshold' => 1, 'discount_percent' => 5]]);
        $referrer = $this->createCustomer();
        $referred = $this->createCustomer([
            'phone' => '761234567',
            'referral_code' => 'REFERRED1',
            'referred_by_user_id' => $referrer->id,
        ]);
        $proof = UploadedFile::fake()->createWithContent(
            'payment.png',
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL1ZQAAAABJRU5ErkJggg=='),
        )->store('payment-proofs', 'local');
        $order = $this->createOrder($referred, [
            'reference' => 'FS-REFERRAL-0001',
            'status' => 'pending',
            'payment_status' => 'submitted',
            'payment_proof_path' => $proof,
        ]);
        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin@example.test',
            'password' => 'another-secure-password',
            'is_admin' => true,
        ]);

        $this->actingAs($admin)->patchJson("/api/admin/orders/{$order->id}", [
            'status' => 'delivered',
            'payment_status' => 'verified',
        ])->assertOk();

        $this->actingAs($admin)->patchJson("/api/admin/orders/{$order->id}", [
            'status' => 'delivered',
            'payment_status' => 'verified',
        ])->assertOk();

        $this->assertSame(1, $referrer->fresh()->qualified_referrals_count);
        $this->assertNotNull($referrer->fresh()->referral_reward_earned_at);
        $this->assertNotNull($referred->fresh()->referral_qualified_at);
    }

    public function test_admin_can_change_the_referral_threshold_and_discount(): void
    {
        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin@example.test',
            'password' => 'another-secure-password',
            'is_admin' => true,
        ]);

        $this->actingAs($admin)->putJson('/api/admin/referrals', [
            'threshold' => 10,
            'discount_percent' => 12,
        ])->assertOk()
            ->assertJsonPath('settings.threshold', 10)
            ->assertJsonPath('settings.discount_percent', 12);
    }

    public function test_admin_can_sign_in_from_a_browser_with_an_active_customer_session(): void
    {
        $customer = $this->createCustomer();
        User::create([
            'name' => 'Admin',
            'email' => 'admin@example.test',
            'password' => 'another-secure-password',
            'is_admin' => true,
        ]);

        $this->actingAs($customer)
            ->postJson('/api/admin/login', [
                'email' => 'admin@example.test',
                'password' => 'another-secure-password',
            ])
            ->assertOk();

        $this->getJson('/api/admin/me')->assertOk()
            ->assertJsonPath('user.email', 'admin@example.test');
    }

    public function test_order_is_created_before_optional_account_and_can_be_claimed_in_the_same_session(): void
    {
        $product = $this->createProduct();
        $zone = DeliveryZone::create(['name' => 'Dieuppeul-Derklé', 'fee' => 1500, 'active' => true]);
        $response = $this->postJson('/api/orders', [
            'customer_name' => 'Aïssatou Ndiaye',
            'customer_phone' => '+221777654321',
            'delivery_zone_id' => $zone->id,
            'delivery_address' => 'À côté du marché',
            'delivery_latitude' => 14.7123,
            'delivery_longitude' => -17.4532,
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
        ])->assertCreated();
        $orderId = $response->json('order.id');

        $this->postJson('/api/client/register', [
            'name' => 'Aïssatou Ndiaye',
            'phone' => '77 765 43 21',
            'password' => 'customer-password-2026',
            'password_confirmation' => 'customer-password-2026',
        ])->assertCreated();
        $this->postJson('/api/client/orders/claim-pending')->assertOk()
            ->assertJsonPath('order.id', $orderId);

        $this->assertSame(
            User::query()->where('phone', '777654321')->value('id'),
            Order::query()->findOrFail($orderId)->user_id,
        );
        $this->assertSame(14.7123, Order::query()->findOrFail($orderId)->delivery_latitude);
        $this->assertSame(-17.4532, Order::query()->findOrFail($orderId)->delivery_longitude);
        $this->postJson('/api/client/orders/claim-pending')->assertUnprocessable();
    }

    public function test_order_reserves_stock_and_cancellation_and_reactivation_update_it_once(): void
    {
        $product = $this->createProduct();
        $product->update(['stock' => 2]);
        $zone = DeliveryZone::create(['name' => 'Dieuppeul-Derklé', 'fee' => 1500, 'active' => true]);
        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin@example.test',
            'password' => 'another-secure-password',
            'is_admin' => true,
        ]);

        $response = $this->postJson('/api/orders', [
            'customer_name' => 'Client Test',
            'customer_phone' => '771234567',
            'delivery_zone_id' => $zone->id,
            'delivery_address' => 'Près du marché',
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
        ])->assertCreated();
        $order = Order::query()->findOrFail($response->json('order.id'));
        $this->assertSame(1, $product->fresh()->stock);
        $this->assertTrue($order->stock_reserved);

        $this->actingAs($admin)->patchJson("/api/admin/orders/{$order->id}", [
            'status' => 'cancelled',
            'payment_status' => 'unpaid',
        ])->assertOk();
        $this->assertSame(2, $product->fresh()->stock);
        $this->assertFalse($order->fresh()->stock_reserved);

        $this->patchJson("/api/admin/orders/{$order->id}", [
            'status' => 'pending',
            'payment_status' => 'unpaid',
        ])->assertOk();
        $this->assertSame(1, $product->fresh()->stock);
        $this->assertTrue($order->fresh()->stock_reserved);

        $this->patchJson("/api/admin/orders/{$order->id}", [
            'status' => 'cancelled',
            'payment_status' => 'unpaid',
        ])->assertOk();
        $this->assertSame(2, $product->fresh()->stock);
    }

    public function test_order_rejects_a_product_that_is_out_of_stock(): void
    {
        $product = $this->createProduct();
        $product->update(['stock' => 0]);
        $zone = DeliveryZone::create(['name' => 'Dieuppeul-Derklé', 'fee' => 1500, 'active' => true]);

        $this->postJson('/api/orders', [
            'customer_name' => 'Client Test',
            'customer_phone' => '771234567',
            'delivery_zone_id' => $zone->id,
            'delivery_address' => 'Près du marché',
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('items');

        $this->assertSame(0, $product->fresh()->stock);
        $this->assertDatabaseCount('orders', 0);
    }

    public function test_deleting_a_pending_order_or_customer_releases_reserved_stock_once(): void
    {
        $customer = $this->createCustomer();
        $product = $this->createProduct();
        $product->update(['stock' => 2]);
        $zone = DeliveryZone::create(['name' => 'Dieuppeul-Derklé', 'fee' => 1500, 'active' => true]);
        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin@example.test',
            'password' => 'another-secure-password',
            'is_admin' => true,
        ]);
        $payload = [
            'customer_name' => $customer->name,
            'customer_phone' => $customer->phone,
            'delivery_zone_id' => $zone->id,
            'delivery_address' => 'Près du marché',
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
        ];

        $orderId = $this->actingAs($customer)->postJson('/api/orders', $payload)
            ->assertCreated()->json('order.id');
        $this->assertSame(1, $product->fresh()->stock);
        $this->actingAs($admin)->deleteJson("/api/admin/orders/{$orderId}")->assertOk();
        $this->assertSame(2, $product->fresh()->stock);

        $this->actingAs($customer)->postJson('/api/orders', $payload)->assertCreated();
        $this->assertSame(1, $product->fresh()->stock);
        $this->actingAs($admin)->deleteJson("/api/admin/products/{$product->id}")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('product');

        $this->deleteJson("/api/admin/customers/{$customer->id}")->assertOk();
        $this->assertSame(2, $product->fresh()->stock);
        $this->assertDatabaseMissing('orders', ['user_id' => $customer->id]);
    }

    public function test_customer_announcement_can_show_a_product_and_accept_an_order(): void
    {
        Storage::fake('local');
        $product = $this->createProduct();
        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin@example.test',
            'password' => 'another-secure-password',
            'is_admin' => true,
        ]);
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL1ZQAAAABJRU5ErkJggg==');

        $response = $this->actingAs($admin)->post('/api/admin/announcements', [
            'title' => 'Nouvelle collection',
            'body' => 'Découvrez ce sac.',
            'published' => '1',
            'product_id' => $product->id,
            'image' => UploadedFile::fake()->createWithContent('announcement.png', $png),
        ])->assertCreated();
        $announcement = CustomerAnnouncement::query()->findOrFail($response->json('announcement.id'));

        $customer = $this->createCustomer();
        $dashboard = $this->actingAs($customer)->getJson('/api/client/dashboard')
            ->assertOk()
            ->assertJsonPath('announcements.0.product.id', $product->id)
            ->assertJsonPath('announcements.0.product.in_stock', true);
        $imageUrl = $dashboard->json('announcements.0.image_url');
        $this->get($imageUrl)->assertOk();

        $zone = DeliveryZone::create(['name' => 'Dieuppeul-Derklé', 'fee' => 1500, 'active' => true]);
        $this->postJson('/api/orders', [
            'customer_name' => $customer->name,
            'customer_phone' => $customer->phone,
            'delivery_zone_id' => $zone->id,
            'delivery_address' => 'Près du marché',
            'items' => [['product_id' => $announcement->product_id, 'quantity' => 1]],
        ])->assertCreated();

        $this->assertSame(4, $product->fresh()->stock);
    }

    public function test_admin_confirmation_assigns_a_free_driver_and_driver_delivery_updates_client_tracking(): void
    {
        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin@example.test',
            'password' => 'another-secure-password',
            'is_admin' => true,
        ]);
        $customer = $this->createCustomer();
        $driverResponse = $this->actingAs($admin)->postJson('/api/admin/drivers', [
            'name' => 'Livreur Test',
            'phone' => '701234567',
            'password' => 'secure-driver-password',
        ])->assertCreated();
        $driverId = $driverResponse->json('driver.id');
        $driver = User::query()->findOrFail($driverId);
        $this->postJson('/api/client/login', [
            'phone' => '701234567',
            'password' => 'secure-driver-password',
        ])->assertUnprocessable();
        $order = $this->createOrder($customer, [
            'delivery_latitude' => 14.713,
            'delivery_longitude' => -17.455,
        ]);

        $this->actingAs($admin)->patchJson("/api/admin/orders/{$order->id}", [
            'status' => 'confirmed',
            'payment_status' => 'verified',
        ])->assertOk()->assertJsonPath('order.driver_id', $driverId);

        $this->postJson('/api/driver/login', [
            'phone' => '701234567',
            'password' => 'secure-driver-password',
        ])->assertOk();
        $this->getJson('/api/driver/dashboard')
            ->assertOk()
            ->assertJsonPath('orders.0.id', $order->id);
        $this->postJson("/api/driver/orders/{$order->id}/start")->assertOk();
        $this->postJson('/api/driver/location', [
            'latitude' => 14.714,
            'longitude' => -17.456,
        ])->assertOk();

        $this->actingAs($customer)->getJson("/api/client/orders/{$order->id}/tracking")
            ->assertOk()
            ->assertJsonPath('tracking', true)
            ->assertJsonPath('driver.location.latitude', 14.714)
            ->assertJsonPath('customer_location.longitude', -17.455);
        $otherCustomer = $this->createCustomer(['phone' => '761234567', 'referral_code' => 'OTHER123']);
        $this->actingAs($otherCustomer)->getJson("/api/client/orders/{$order->id}/tracking")->assertNotFound();

        $this->actingAs($driver)->postJson("/api/driver/orders/{$order->id}/delivered")->assertOk();
        $this->assertSame('delivered', $order->fresh()->status);
        $this->assertNull($driver->fresh()->current_latitude);
    }

    public function test_confirmed_order_waits_for_a_free_driver_then_is_assigned_when_one_is_available(): void
    {
        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin@example.test',
            'password' => 'another-secure-password',
            'is_admin' => true,
        ]);
        $customer = $this->createCustomer();
        $this->actingAs($admin)->postJson('/api/admin/drivers', [
            'name' => 'Livreur Test',
            'phone' => '701234567',
            'password' => 'secure-driver-password',
        ])->assertCreated();
        $driver = User::query()->where('is_driver', true)->firstOrFail();
        $firstOrder = $this->createOrder($customer, ['reference' => 'FS-DRIVER-00001']);
        $secondOrder = $this->createOrder($customer, ['reference' => 'FS-DRIVER-00002']);

        $this->actingAs($admin)->patchJson("/api/admin/orders/{$firstOrder->id}", [
            'status' => 'confirmed',
            'payment_status' => 'verified',
        ])->assertOk()->assertJsonPath('order.driver_id', $driver->id);
        $this->patchJson("/api/admin/orders/{$secondOrder->id}", [
            'status' => 'confirmed',
            'payment_status' => 'verified',
        ])->assertOk()->assertJsonPath('order.driver_id', null);

        $this->actingAs($driver)->postJson("/api/driver/orders/{$firstOrder->id}/start")->assertOk();
        $this->postJson("/api/driver/orders/{$firstOrder->id}/delivered")->assertOk();
        $this->assertSame($driver->id, $secondOrder->fresh()->driver_id);
    }

    public function test_customer_can_upload_a_private_profile_photo_and_only_see_published_announcements(): void
    {
        Storage::fake('local');
        $customer = $this->createCustomer();
        CustomerAnnouncement::create([
            'title' => 'Nouvelle collection',
            'body' => 'Les nouvelles pièces sont disponibles.',
            'published' => true,
            'published_at' => now(),
        ]);
        CustomerAnnouncement::create([
            'title' => 'Brouillon privé',
            'body' => 'Pas encore publié.',
            'published' => false,
        ]);
        $image = UploadedFile::fake()->createWithContent(
            'avatar.png',
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL1ZQAAAABJRU5ErkJggg=='),
        );

        $this->actingAs($customer)->post('/api/client/profile/photo', ['photo' => $image])
            ->assertOk()
            ->assertJsonStructure(['photo_url']);
        $customer->refresh();
        $this->getJson('/api/client/dashboard')->assertOk()
            ->assertJsonPath('user.photo_url', route('api.client.photo'))
            ->assertJsonCount(1, 'announcements')
            ->assertJsonPath('announcements.0.title', 'Nouvelle collection');
        $this->get('/api/client/profile/photo')->assertOk();

        $otherCustomer = $this->createCustomer(['phone' => '761234567', 'referral_code' => 'OTHER123']);
        $this->actingAs($otherCustomer)->get('/api/client/profile/photo')->assertNotFound();
    }

    public function test_admin_can_manage_announcements_and_delete_a_customer_with_related_records(): void
    {
        Storage::fake('local');
        Storage::disk('local')->put('payment-proofs/customer-delete.png', 'proof');
        Storage::disk('local')->put('customer-profiles/customer-delete.png', 'photo');
        Setting::updateOrCreate(['key' => 'referral'], ['value' => ['threshold' => 1]]);
        $referrer = $this->createCustomer([
            'phone' => '781234567',
            'referral_code' => 'REFERRER1',
            'qualified_referrals_count' => 1,
            'referral_reward_earned_at' => now(),
        ]);
        $customer = $this->createCustomer([
            'phone' => '761234567',
            'referral_code' => 'REFERRED1',
            'referred_by_user_id' => $referrer->id,
            'referral_qualified_at' => now(),
            'profile_photo_path' => 'customer-profiles/customer-delete.png',
        ]);
        $order = $this->createOrder($customer, [
            'reference' => 'FS-DELETE-0001',
            'payment_proof_path' => 'payment-proofs/customer-delete.png',
        ]);
        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => null,
            'product_name' => 'Article test',
            'quantity' => 1,
            'unit_price' => 10000,
            'line_total' => 10000,
        ]);
        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin@example.test',
            'password' => 'another-secure-password',
            'is_admin' => true,
        ]);

        $announcement = $this->actingAs($admin)->postJson('/api/admin/announcements', [
            'title' => 'Offre spéciale',
            'body' => 'Une nouvelle annonce pour les clients.',
            'published' => true,
        ])->assertCreated()->json('announcement.id');
        $this->getJson('/api/admin/customers?search=Client%20Test')->assertOk()
            ->assertJsonFragment(['phone' => '781234567']);
        $this->get(route('api.admin.customers.photo', $customer))->assertOk();
        $this->actingAs($customer)->getJson('/api/client/dashboard')->assertOk()
            ->assertJsonPath('announcements.0.id', $announcement);

        $this->actingAs($admin)->deleteJson("/api/admin/customers/{$customer->id}")->assertOk();
        $this->assertDatabaseMissing('users', ['id' => $customer->id]);
        $this->assertDatabaseMissing('orders', ['id' => $order->id]);
        $this->assertDatabaseMissing('order_items', ['order_id' => $order->id]);
        $this->assertSame(0, $referrer->fresh()->qualified_referrals_count);
        $this->assertNull($referrer->fresh()->referral_reward_earned_at);
        Storage::disk('local')->assertMissing('payment-proofs/customer-delete.png');
        Storage::disk('local')->assertMissing('customer-profiles/customer-delete.png');
    }

    public function test_admin_rankings_include_customers_outside_the_first_hundred(): void
    {
        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin@example.test',
            'password' => 'another-secure-password',
            'is_admin' => true,
        ]);
        for ($index = 0; $index < 100; $index++) {
            $phone = '70'.str_pad((string) $index, 7, '0', STR_PAD_LEFT);
            $this->createCustomer([
                'phone' => $phone,
                'referral_code' => 'C'.str_pad((string) $index, 7, '0', STR_PAD_LEFT),
                'qualified_referrals_count' => 1,
            ]);
        }

        $customerOutsideLimit = $this->createCustomer([
            'phone' => '701000100',
            'referral_code' => 'C0000100',
        ]);
        $this->createOrder($customerOutsideLimit, [
            'reference' => 'FS-RANKING-0001',
            'total' => 90000,
        ]);
        foreach (range(1, 3) as $index) {
            $this->createCustomer([
                'phone' => '76'.str_pad((string) $index, 7, '0', STR_PAD_LEFT),
                'referral_code' => 'D'.str_pad((string) $index, 7, '0', STR_PAD_LEFT),
                'referred_by_user_id' => $customerOutsideLimit->id,
            ]);
        }

        $this->actingAs($admin)->getJson('/api/admin/referrals')
            ->assertOk()
            ->assertJsonPath('top_customers.0.id', $customerOutsideLimit->id)
            ->assertJsonPath('top_customers.0.amount_paid', 90000)
            ->assertJsonPath('top_invites.0.id', $customerOutsideLimit->id)
            ->assertJsonPath('top_invites.0.referrals_total', 3);
    }

    private function createCustomer(array $overrides = []): User
    {
        $phone = $overrides['phone'] ?? '771234567';

        return User::create(array_merge([
            'name' => 'Client Test',
            'email' => 'client-'.$phone.'@customers.fatoushop.local',
            'phone' => $phone,
            'password' => 'a-strong-test-password',
            'is_admin' => false,
            'referral_code' => 'CODE'.substr($phone, -4),
        ], $overrides));
    }

    private function createProduct(): Product
    {
        return Product::create([
            'name' => 'Sac de test',
            'category' => 'Sacs',
            'description' => 'Produit de test',
            'price' => 10000,
            'image_path' => 'https://example.com/product.jpg',
            'image_alt' => 'Sac',
            'tone' => 'rose',
            'stock' => 5,
            'active' => true,
        ]);
    }

    private function createOrder(User $customer, array $overrides = []): Order
    {
        return Order::create(array_merge([
            'reference' => 'FS-TEST-000001',
            'customer_name' => $customer->name,
            'customer_phone' => $customer->phone,
            'user_id' => $customer->id,
            'delivery_zone_name' => 'Dieuppeul-Derklé',
            'delivery_address' => 'Adresse de test',
            'subtotal' => 10000,
            'delivery_fee' => 1500,
            'total' => 11500,
            'status' => 'pending',
            'payment_status' => 'verified',
            'payment_proof_path' => 'payment-proofs/test.png',
        ], $overrides));
    }
}
