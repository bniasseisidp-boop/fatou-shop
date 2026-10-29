<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 24)->unique();
            $table->string('customer_name');
            $table->string('customer_phone', 25)->index();
            $table->string('customer_email')->nullable();
            $table->foreignId('delivery_zone_id')->nullable()->constrained()->nullOnDelete();
            $table->string('delivery_zone_name');
            $table->text('delivery_address');
            $table->text('delivery_notes')->nullable();
            $table->unsignedInteger('subtotal');
            $table->unsignedInteger('delivery_fee');
            $table->unsignedInteger('total');
            $table->string('status', 30)->default('pending')->index();
            $table->string('payment_method', 30)->nullable();
            $table->string('payment_status', 30)->default('unpaid')->index();
            $table->string('payer_name')->nullable();
            $table->string('payer_phone', 25)->nullable();
            $table->string('payment_reference')->nullable();
            $table->string('payment_proof_path')->nullable();
            $table->text('admin_notes')->nullable();
            $table->timestamp('payment_submitted_at')->nullable();
            $table->timestamp('payment_verified_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
