<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['title', 'body', 'product_id', 'image_path', 'published', 'published_at', 'admin_id'])]
class CustomerAnnouncement extends Model
{
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    protected function casts(): array
    {
        return [
            'published' => 'boolean',
            'published_at' => 'datetime',
        ];
    }
}
