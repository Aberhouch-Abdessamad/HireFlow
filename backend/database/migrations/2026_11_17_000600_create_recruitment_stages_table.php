<?php

use App\Enums\StageType;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recruitment_stages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('name', 60);
            $table->string('type', 20);
            $table->unsignedSmallInteger('position');
            $table->timestamps();

            $table->unique(['company_id', 'name']);
            $table->index(['company_id', 'position']);
        });

        // Backfill the default pipeline for companies created before this migration.
        // New companies get theirs from CompanyObserver.
        $now = now();
        foreach (DB::table('companies')->pluck('id') as $companyId) {
            foreach (StageType::defaultPipeline() as $index => $stage) {
                DB::table('recruitment_stages')->insert([
                    'company_id' => $companyId,
                    'name' => $stage['name'],
                    'type' => $stage['type']->value,
                    'position' => $index + 1,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('recruitment_stages');
    }
};
