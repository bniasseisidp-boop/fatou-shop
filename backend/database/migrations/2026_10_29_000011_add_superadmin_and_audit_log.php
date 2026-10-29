<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->boolean('is_superadmin')->default(false)->after('is_admin');
            $table->boolean('admin_active')->default(true)->after('is_superadmin');
            $table->index(['is_admin', 'is_superadmin', 'admin_active'], 'users_admin_access_index');
        });

        Schema::create('admin_activity', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('actor_label')->nullable();
            $table->string('action', 120);
            $table->string('method', 10)->nullable();
            $table->string('path', 255)->nullable();
            $table->unsignedSmallInteger('status')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamps();

            $table->index(['created_at', 'action']);
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_activity');

        Schema::table('users', function (Blueprint $table): void {
            $table->dropIndex('users_admin_access_index');
            $table->dropColumn(['is_superadmin', 'admin_active']);
        });
    }
};
