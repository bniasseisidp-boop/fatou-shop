<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->boolean('is_driver')->default(false)->index();
            $table->boolean('driver_active')->default(true);
            $table->decimal('current_latitude', 10, 7)->nullable();
            $table->decimal('current_longitude', 10, 7)->nullable();
            $table->timestamp('location_updated_at')->nullable();
        });

        Schema::table('orders', function (Blueprint $table): void {
            $table->foreignId('driver_id')->nullable()->after('user_id')->constrained('users')->nullOnDelete();
            $table->decimal('delivery_latitude', 10, 7)->nullable()->after('delivery_address');
            $table->decimal('delivery_longitude', 10, 7)->nullable()->after('delivery_latitude');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table): void {
            $table->dropForeign(['driver_id']);
            $table->dropColumn(['driver_id', 'delivery_latitude', 'delivery_longitude']);
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn(['is_driver', 'driver_active', 'current_latitude', 'current_longitude', 'location_updated_at']);
        });
    }
};
