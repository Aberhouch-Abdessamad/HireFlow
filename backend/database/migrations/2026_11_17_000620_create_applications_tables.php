<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('job_posting_id')->constrained()->restrictOnDelete();
            $table->foreignId('candidate_id')->constrained()->restrictOnDelete();
            $table->foreignId('current_stage_id')->constrained('recruitment_stages')->restrictOnDelete();
            $table->string('status', 20)->default('active');
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->string('source', 30)->default('manual');
            $table->text('cover_letter')->nullable();
            $table->string('rejection_reason', 40)->nullable();
            $table->text('rejection_note')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->timestamp('hired_at')->nullable();
            $table->timestamp('applied_at');
            $table->timestamp('stage_entered_at');
            $table->timestamps();
            $table->softDeletes();

            // One application per candidate per job.
            $table->unique(['job_posting_id', 'candidate_id']);
            $table->index(['company_id', 'status', 'current_stage_id']);
            $table->index(['company_id', 'applied_at']);
            $table->index(['company_id', 'assigned_to']);
        });

        // Append-only record of every stage or status change.
        Schema::create('application_stage_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('application_id')->constrained()->cascadeOnDelete();
            $table->foreignId('from_stage_id')->nullable()->constrained('recruitment_stages')->nullOnDelete();
            $table->foreignId('to_stage_id')->nullable()->constrained('recruitment_stages')->nullOnDelete();
            $table->string('from_status', 20)->nullable();
            $table->string('to_status', 20);
            $table->foreignId('performed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['application_id', 'created_at']);
            $table->index(['to_stage_id', 'created_at']);
        });

        Schema::create('application_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('application_id')->constrained()->cascadeOnDelete();
            $table->foreignId('author_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('body');
            $table->timestamps();
            $table->index(['application_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('application_notes');
        Schema::dropIfExists('application_stage_history');
        Schema::dropIfExists('applications');
    }
};
