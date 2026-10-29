<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

#[Fillable([
    'name', 'email', 'password', 'is_admin', 'is_superadmin', 'admin_active', 'phone', 'referral_code',
    'referred_by_user_id', 'qualified_referrals_count', 'referral_qualified_at',
    'referral_reward_earned_at', 'referral_reward_used_at', 'profile_photo_path',
    'is_driver', 'driver_active', 'current_latitude', 'current_longitude', 'location_updated_at',
])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_admin' => 'boolean',
            'is_superadmin' => 'boolean',
            'admin_active' => 'boolean',
            'is_driver' => 'boolean',
            'driver_active' => 'boolean',
            'current_latitude' => 'float',
            'current_longitude' => 'float',
            'location_updated_at' => 'datetime',
            'qualified_referrals_count' => 'integer',
            'referral_qualified_at' => 'datetime',
            'referral_reward_earned_at' => 'datetime',
            'referral_reward_used_at' => 'datetime',
        ];
    }

    public function orders(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function referrer(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(self::class, 'referred_by_user_id');
    }

    public function referrals(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(self::class, 'referred_by_user_id');
    }

    public function assignedOrders(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Order::class, 'driver_id');
    }
}
