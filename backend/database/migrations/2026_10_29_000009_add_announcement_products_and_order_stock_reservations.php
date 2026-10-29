<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table): void {
            $table->boolean('stock_reserved')->default(false);
        });

        Schema::table('customer_announcements', function (Blueprint $table): void {
            $table->foreignId('product_id')->nullable()->after('body')->constrained()->nullOnDelete();
            $table->string('image_path')->nullable()->after('product_id');
        });
    }

    public function down(): void
    {
        Schema::table('customer_announcements', function (Blueprint $table): void {
            $table->dropForeign(['product_id']);
            $table->dropColumn(['product_id', 'image_path']);
        });

        Schema::table('orders', function (Blueprint $table): void {
            $table->dropColumn('stock_reserved');
        });
    }
};
