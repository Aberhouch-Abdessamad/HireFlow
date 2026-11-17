<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('interviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('application_id')->constrained()->cascadeOnDelete();
            $table->string('type', 20);
            $table->string('status', 20)->default('scheduled');
            // UTC start time; `timezone` is the organiser's zone, for display.
            $table->timestamp('scheduled_at');
            $table->unsignedSmallInteger('duration_minutes');
            $table->string('timezone', 64)->default('UTC');
            $table->string('meeting_url')->nullable();
            $table->string('location', 200)->nullable();
            $table->text('agenda')->nullable();
            $table->foreignId('scheduled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('cancellation_reason')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('reminder_sent_at')->nullable();
            $table->timestamps();

            $table->index(['company_id', 'scheduled_at']);
            $table->index(['company_id', 'status']);
            $table->index('application_id');
        });

        Schema::create('interview_participants', function (Blueprint $table) {
            $table->foreignId('interview_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->primary(['interview_id', 'user_id']);
            $table->index('user_id');
        });

        Schema::create('interview_feedback', function (Blueprint $table) {
            $table->id();
            $table->foreignId('interview_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('technical_score');
            $table->unsignedTinyInteger('communication_score');
            $table->unsignedTinyInteger('problem_solving_score');
            $table->unsignedTinyInteger('overall_rating');
            $table->string('recommendation', 20);
            $table->text('comments')->nullable();
            $table->timestamps();

            $table->unique(['interview_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('interview_feedback');
        Schema::dropIfExists('interview_participants');
        Schema::dropIfExists('interviews');
    }
};
