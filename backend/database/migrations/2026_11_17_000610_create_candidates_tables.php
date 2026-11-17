<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // A company's talent pool. The same person applying to two companies is two rows
        // (one per tenant), so notes and history never cross company boundaries.
        Schema::create('candidates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('first_name', 80);
            $table->string('last_name', 80);
            $table->string('email');
            $table->string('phone', 40)->nullable();
            // Digits only, for duplicate detection.
            $table->string('phone_normalized', 40)->nullable();
            $table->string('location', 150)->nullable();
            $table->string('headline', 150)->nullable();
            $table->string('linkedin_url')->nullable();
            $table->string('portfolio_url')->nullable();
            $table->string('source', 30)->default('manual');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['company_id', 'email']);
            $table->index(['company_id', 'phone_normalized']);
            $table->index(['company_id', 'last_name', 'first_name']);
            $table->index(['company_id', 'created_at']);
        });

        Schema::create('candidate_experiences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('candidate_id')->constrained()->cascadeOnDelete();
            $table->string('company_name', 120);
            $table->string('title', 120);
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->boolean('is_current')->default(false);
            $table->text('description')->nullable();
            $table->timestamps();
        });

        Schema::create('candidate_educations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('candidate_id')->constrained()->cascadeOnDelete();
            $table->string('institution', 150);
            $table->string('degree', 120)->nullable();
            $table->string('field_of_study', 120)->nullable();
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->timestamps();
        });

        Schema::create('candidate_skill', function (Blueprint $table) {
            $table->foreignId('candidate_id')->constrained()->cascadeOnDelete();
            $table->foreignId('skill_id')->constrained()->cascadeOnDelete();
            $table->primary(['candidate_id', 'skill_id']);
            $table->index('skill_id');
        });

        Schema::create('tags', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('name', 50);
            $table->timestamps();
            $table->unique(['company_id', 'name']);
        });

        Schema::create('candidate_tag', function (Blueprint $table) {
            $table->foreignId('candidate_id')->constrained()->cascadeOnDelete();
            $table->foreignId('tag_id')->constrained()->cascadeOnDelete();
            $table->primary(['candidate_id', 'tag_id']);
            $table->index('tag_id');
        });

        Schema::create('candidate_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('candidate_id')->constrained()->cascadeOnDelete();
            $table->foreignId('author_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('body');
            $table->timestamps();
            $table->index(['candidate_id', 'created_at']);
        });

        Schema::create('candidate_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('candidate_id')->constrained()->cascadeOnDelete();
            $table->string('type', 20)->default('cv');
            // Private disk path. Never serialised to API responses.
            $table->string('path');
            $table->string('original_name');
            $table->string('mime_type', 120);
            $table->unsignedInteger('size');
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['candidate_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('candidate_documents');
        Schema::dropIfExists('candidate_notes');
        Schema::dropIfExists('candidate_tag');
        Schema::dropIfExists('tags');
        Schema::dropIfExists('candidate_skill');
        Schema::dropIfExists('candidate_educations');
        Schema::dropIfExists('candidate_experiences');
        Schema::dropIfExists('candidates');
    }
};
