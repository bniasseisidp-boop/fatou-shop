<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

#[Fillable([
    'name', 'category', 'description', 'price', 'old_price', 'label',
    'image_path', 'image_alt', 'tone', 'stock', 'active',
])]
class Product extends Model
{
    public const LOW_STOCK_THRESHOLD = 3;

    protected function casts(): array
    {
        return [
            'price' => 'integer',
            'old_price' => 'integer',
            'stock' => 'integer',
            'active' => 'boolean',
        ];
    }

    protected function imageUrl(): string
    {
        if (! $this->image_path) {
            return '';
        }

        return Str::startsWith($this->image_path, ['https://', 'http://'])
            ? $this->image_path
            : route('api.products.image', $this->getKey());
    }

    public function getImageUrlAttribute(): string
    {
        return $this->imageUrl();
    }

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }
}
