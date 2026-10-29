<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('profile_photo_path')->nullable();
        });

        Schema::create('customer_announcements', function (Blueprint $table): void {
            $table->id();
            $table->string('title', 160);
            $table->text('body');
            $table->boolean('published')->default(false)->index();
            $table->timestamp('published_at')->nullable();
            $table->foreignId('admin_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_announcements');

        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn('profile_photo_path');
        });
    }
};
