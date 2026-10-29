<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'reference', 'customer_name', 'customer_phone', 'customer_email',
    'delivery_zone_id', 'delivery_zone_name', 'delivery_address', 'delivery_notes',
    'subtotal', 'delivery_fee', 'total', 'status', 'payment_method',
    'payment_status', 'payer_name', 'payer_phone', 'payment_reference',
    'payment_proof_path', 'admin_notes', 'payment_submitted_at',
    'payment_verified_at', 'delivered_at',
    'user_id', 'driver_id', 'delivery_latitude', 'delivery_longitude',
    'referral_discount_amount', 'referral_discount_percent', 'referral_code', 'stock_reserved',
])]
class Order extends Model
{
    protected function casts(): array
    {
        return [
            'subtotal' => 'integer',
            'delivery_fee' => 'integer',
            'total' => 'integer',
            'referral_discount_amount' => 'integer',
            'referral_discount_percent' => 'integer',
            'payment_submitted_at' => 'datetime',
            'payment_verified_at' => 'datetime',
            'delivered_at' => 'datetime',
            'stock_reserved' => 'boolean',
            'delivery_latitude' => 'float',
            'delivery_longitude' => 'float',
        ];
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function deliveryZone(): BelongsTo
    {
        return $this->belongsTo(DeliveryZone::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function driver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'driver_id');
    }
}
