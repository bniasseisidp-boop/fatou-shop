<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'user_id', 'actor_label', 'action', 'method', 'path', 'status', 'ip_address', 'user_agent',
])]
class AdminActivity extends Model
{
    protected $table = 'admin_activity';

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
