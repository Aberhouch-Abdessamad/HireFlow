<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Named job_postings (not "jobs") because Laravel's queue already uses a `jobs` table.
     */
    public function up(): void
    {
        Schema::create('job_postings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('department_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            // Globally unique: used in public URLs (/careers/jobs/{slug}).
            $table->string('slug', 160)->unique();
            $table->string('title', 150);
            $table->text('description');
            $table->text('requirements')->nullable();
            $table->string('location', 150)->nullable();
            $table->string('work_mode', 20)->default('onsite');
            $table->string('employment_type', 20);
            $table->string('experience_level', 20);
            // Whole currency units per year.
            $table->unsignedInteger('salary_min')->nullable();
            $table->unsignedInteger('salary_max')->nullable();
            $table->char('salary_currency', 3)->nullable();
            $table->boolean('salary_visible')->default(false);
            $table->string('status', 20)->default('draft');
            $table->timestamp('published_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['company_id', 'status']);
            $table->index(['company_id', 'department_id']);
            $table->index(['company_id', 'created_at']);
            $table->index(['status', 'expires_at']);
        });

        Schema::create('job_posting_skill', function (Blueprint $table) {
            $table->foreignId('job_posting_id')->constrained()->cascadeOnDelete();
            $table->foreignId('skill_id')->constrained()->cascadeOnDelete();
            $table->boolean('is_required')->default(true);

            $table->primary(['job_posting_id', 'skill_id']);
            $table->index('skill_id');
        });

        Schema::create('job_posting_recruiter', function (Blueprint $table) {
            $table->foreignId('job_posting_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            $table->primary(['job_posting_id', 'user_id']);
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_posting_recruiter');
        Schema::dropIfExists('job_posting_skill');
        Schema::dropIfExists('job_postings');
    }
};
