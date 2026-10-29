<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('phone', 25)->nullable()->unique();
            $table->string('referral_code', 20)->nullable()->unique();
            $table->foreignId('referred_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('qualified_referrals_count')->default(0);
            $table->timestamp('referral_qualified_at')->nullable();
            $table->timestamp('referral_reward_earned_at')->nullable();
            $table->timestamp('referral_reward_used_at')->nullable();
        });

        Schema::table('orders', function (Blueprint $table): void {
            $table->foreignId('user_id')->nullable()->after('customer_email')->constrained('users')->nullOnDelete();
            $table->unsignedInteger('referral_discount_amount')->default(0)->after('subtotal');
            $table->unsignedTinyInteger('referral_discount_percent')->nullable()->after('referral_discount_amount');
            $table->string('referral_code', 20)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table): void {
            $table->dropForeign(['user_id']);
            $table->dropColumn(['user_id', 'referral_discount_amount', 'referral_discount_percent', 'referral_code']);
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->dropForeign(['referred_by_user_id']);
            $table->dropUnique(['phone']);
            $table->dropUnique(['referral_code']);
            $table->dropColumn([
                'phone', 'referral_code', 'referred_by_user_id', 'qualified_referrals_count',
                'referral_qualified_at', 'referral_reward_earned_at', 'referral_reward_used_at',
            ]);
        });
    }
};
