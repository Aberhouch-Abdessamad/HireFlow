<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('offers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('application_id')->constrained()->cascadeOnDelete();
            $table->string('status', 20)->default('draft');
            // Yearly gross amount in whole currency units.
            $table->unsignedInteger('salary_amount');
            $table->char('currency', 3);
            $table->string('contract_type', 20);
            $table->date('start_date');
            $table->timestamp('expires_at');
            $table->text('message')->nullable();
            $table->text('internal_notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('sent_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('responded_at')->nullable();
            $table->text('response_note')->nullable();
            $table->text('approval_comment')->nullable();
            // SHA-256 of the candidate's response link token.
            $table->char('response_token_hash', 64)->nullable()->unique();
            $table->timestamps();

            $table->index(['company_id', 'status']);
            $table->index(['status', 'expires_at']);
            $table->index('application_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('offers');
    }
};
