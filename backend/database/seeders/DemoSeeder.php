<?php

namespace Database\Seeders;

use App\Enums\ApplicationSource;
use App\Enums\EmploymentType;
use App\Enums\ExperienceLevel;
use App\Enums\InterviewType;
use App\Enums\JobStatus;
use App\Enums\MembershipStatus;
use App\Enums\RejectionReason;
use App\Enums\SystemRole;
use App\Models\Application;
use App\Models\Candidate;
use App\Models\Company;
use App\Models\Department;
use App\Models\Interview;
use App\Models\JobPosting;
use App\Models\Offer;
use App\Models\RecruitmentStage;
use App\Models\Skill;
use App\Models\User;
use App\Services\Applications\ApplicationService;
use App\Services\Interviews\InterviewService;
use App\Services\Offers\OfferService;
use App\Support\Tenancy\TenantContext;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Demo data with fictitious people and companies (all emails use the reserved .test domain).
 * Every demo account uses the password: Password123!
 */
class DemoSeeder extends Seeder
{
    public const PASSWORD = 'Password123!';

    public function run(TenantContext $tenant): void
    {
        $password = Hash::make(self::PASSWORD);

        $superAdmin = $this->user('Platform Admin', 'admin@hireflow.test', $password);
        $superAdmin->grantSuperAdmin();

        $companies = [
            ['name' => 'Acme Robotics', 'slug' => 'acme-robotics', 'domain' => 'acme.test', 'industry' => 'Software', 'size' => '51-200', 'country' => 'MA', 'timezone' => 'Africa/Casablanca'],
            ['name' => 'Globex Health', 'slug' => 'globex-health', 'domain' => 'globex.test', 'industry' => 'Healthcare', 'size' => '201-500', 'country' => 'FR', 'timezone' => 'Europe/Paris'],
        ];

        $people = [
            SystemRole::CompanyAdmin->value => 'Admin',
            SystemRole::HrManager->value => 'HR Manager',
            SystemRole::Recruiter->value => 'Recruiter',
            SystemRole::Interviewer->value => 'Interviewer',
        ];

        foreach ($companies as $data) {
            $company = Company::query()->firstOrCreate(['slug' => $data['slug']], [
                'name' => $data['name'],
                'industry' => $data['industry'],
                'size' => $data['size'],
                'country' => $data['country'],
                'timezone' => $data['timezone'],
                'website' => 'https://www.'.$data['domain'],
            ]);

            foreach ($people as $role => $title) {
                $local = str_replace('_', '.', $role);
                $user = $this->user("{$data['name']} {$title}", "{$local}@{$data['domain']}", $password);

                if (! $company->memberships()->where('user_id', $user->id)->exists()) {
                    $company->users()->attach($user->id, [
                        'status' => MembershipStatus::Active->value,
                        'job_title' => $title,
                        'joined_at' => now()->subMonths(6),
                    ]);
                }

                $tenant->runAs($company, fn () => $user->syncRoles([$role]));
                $user->forceFill(['current_company_id' => $company->id])->save();
            }
        }

        foreach (Company::query()->whereIn('slug', ['acme-robotics', 'globex-health'])->get() as $company) {
            $tenant->runAs($company, fn () => $this->seedJobs($company));
            $tenant->runAs($company, fn () => $this->seedApplications($company));
            $tenant->runAs($company, fn () => $this->seedInterviewsAndOffers($company));
        }

        $this->seedCandidatePortalAccount($password);

        // One recruiter who works for both companies (shows company switching).
        $shared = $this->user('Sam Shared', 'sam.shared@hireflow.test', $password);
        foreach (Company::query()->whereIn('slug', ['acme-robotics', 'globex-health'])->get() as $company) {
            if (! $company->memberships()->where('user_id', $shared->id)->exists()) {
                $company->users()->attach($shared->id, ['status' => MembershipStatus::Active->value, 'joined_at' => now()]);
            }
            $tenant->runAs($company, fn () => $shared->syncRoles([SystemRole::Recruiter->value]));
            $shared->forceFill(['current_company_id' => $company->id])->save();
        }
    }

    private function user(string $name, string $email, string $hashedPassword): User
    {
        $user = User::query()->firstOrNew(['email' => $email]);
        $user->forceFill([
            'name' => $name,
            'password' => $hashedPassword,
            'email_verified_at' => now(),
            'is_active' => true,
        ])->save();

        return $user;
    }

    /** Departments and a realistic mix of job postings in every status. */
    private function seedJobs(Company $company): void
    {
        if (JobPosting::query()->exists()) {
            return;
        }

        $departments = collect(['Engineering', 'Product', 'Sales', 'People'])
            ->mapWithKeys(fn (string $name) => [$name => Department::query()->firstOrCreate(['name' => $name])]);

        $recruiter = $company->users()->where('email', 'like', 'recruiter@%')->first();
        $hr = $company->users()->where('email', 'like', 'hr.manager@%')->first();

        $jobs = [
            ['Senior Backend Engineer (PHP/Laravel)', 'Engineering', JobStatus::Published, EmploymentType::FullTime, ExperienceLevel::Senior, 'remote', ['PHP', 'Laravel', 'MySQL', 'Docker'], 55000, 75000],
            ['Frontend Engineer (React/TypeScript)', 'Engineering', JobStatus::Published, EmploymentType::FullTime, ExperienceLevel::Mid, 'hybrid', ['React', 'TypeScript', 'CSS'], 45000, 60000],
            ['Product Manager', 'Product', JobStatus::Published, EmploymentType::FullTime, ExperienceLevel::Senior, 'onsite', ['Roadmapping', 'Analytics'], 60000, 80000],
            ['Account Executive', 'Sales', JobStatus::Paused, EmploymentType::FullTime, ExperienceLevel::Mid, 'onsite', ['B2B Sales', 'CRM'], 40000, 55000],
            ['Data Analyst Intern', 'Engineering', JobStatus::Published, EmploymentType::Internship, ExperienceLevel::Entry, 'hybrid', ['SQL', 'Python'], null, null],
            ['People Partner', 'People', JobStatus::Draft, EmploymentType::PartTime, ExperienceLevel::Mid, 'onsite', ['Employee Relations'], null, null],
            ['QA Engineer', 'Engineering', JobStatus::Closed, EmploymentType::Contract, ExperienceLevel::Junior, 'remote', ['Testing', 'Playwright'], 35000, 45000],
        ];

        foreach ($jobs as [$title, $department, $status, $type, $level, $mode, $skills, $min, $max]) {
            $job = new JobPosting([
                'title' => $title,
                'description' => "We are looking for a {$title} to join our {$department} team at {$company->name}.\n\nYou will work closely with a cross-functional team, own meaningful projects end to end and help us grow.",
                'requirements' => "- Relevant experience for a {$level->label()} role\n- Strong communication skills\n- A collaborative mindset",
                'location' => $company->country === 'MA' ? 'Casablanca, Morocco' : 'Paris, France',
                'work_mode' => $mode,
                'employment_type' => $type,
                'experience_level' => $level,
                'salary_min' => $min,
                'salary_max' => $max,
                'salary_currency' => $min ? 'EUR' : null,
                'salary_visible' => $min !== null,
                'expires_at' => $status === JobStatus::Closed ? null : now()->addDays(45),
            ]);
            $job->forceFill([
                'slug' => Str::slug($title).'-'.Str::lower(Str::random(6)),
                'department_id' => $departments[$department]->id,
                'created_by' => $hr?->id,
                'status' => $status,
                'published_at' => $status === JobStatus::Draft ? null : now()->subDays(random_int(2, 30)),
                'closed_at' => $status === JobStatus::Closed ? now()->subDays(2) : null,
            ])->save();

            if ($recruiter) {
                $job->recruiters()->sync([$recruiter->id]);
            }

            $job->skills()->sync(collect($skills)->mapWithKeys(fn (string $name) => [
                Skill::query()->firstOrCreate(['slug' => Str::slug($name)], ['name' => $name])->id => ['is_required' => true],
            ])->all());
        }
    }

    /** Fictitious candidates spread across the pipeline of each published job. */
    private function seedApplications(Company $company): void
    {
        if (Candidate::query()->exists()) {
            return;
        }

        $service = app(ApplicationService::class);
        $recruiter = $company->users()->where('email', 'like', 'recruiter@%')->first();
        $stages = RecruitmentStage::query()->orderBy('position')->get()->keyBy(fn ($s) => $s->type->value);
        $jobs = JobPosting::query()->whereIn('status', ['published', 'paused'])->get();
        $sources = [ApplicationSource::CareersPage, ApplicationSource::Linkedin, ApplicationSource::Referral, ApplicationSource::Manual];
        $plan = ['applied', 'applied', 'screening', 'screening', 'shortlist', 'interview', 'interview', 'assessment', 'offer', 'rejected'];

        foreach ($jobs as $jobIndex => $job) {
            foreach ($plan as $i => $target) {
                $candidate = Candidate::factory()->create([
                    'source' => $sources[($i + $jobIndex) % count($sources)],
                    'email' => sprintf('candidate.%d.%d.%d@example.test', $company->id, $job->id, $i),
                ]);

                $application = $service->create($candidate, $job, $candidate->source, null, null);
                $application->forceFill([
                    'applied_at' => now()->subDays(30 - $i * 2 - $jobIndex),
                    'stage_entered_at' => now()->subDays(20 - $i),
                ])->saveQuietly();

                if ($recruiter && $target !== 'applied') {
                    $service->assign($application, $recruiter);
                }

                if ($target === 'rejected') {
                    $service->reject($application, RejectionReason::SkillsMismatch, 'Seeded example', $recruiter);
                } elseif ($target !== 'applied' && $recruiter) {
                    $service->moveToStage($application, $stages[$target], null, $recruiter);
                }
            }
        }
    }

    /** Upcoming and past interviews (with feedback) and offers at different workflow steps. */
    private function seedInterviewsAndOffers(Company $company): void
    {
        if (Interview::query()->exists()) {
            return;
        }

        $interviews = app(InterviewService::class);
        $offers = app(OfferService::class);
        $hr = $company->users()->where('email', 'like', 'hr.manager@%')->first();
        $recruiter = $company->users()->where('email', 'like', 'recruiter@%')->first();
        $interviewer = $company->users()->where('email', 'like', 'interviewer@%')->first();
        if (! $hr || ! $recruiter || ! $interviewer) {
            return;
        }

        $inInterview = Application::query()->where('status', 'active')
            ->whereHas('stage', fn ($q) => $q->whereIn('type', ['interview', 'assessment']))
            ->get();

        foreach ($inInterview as $index => $application) {
            $past = $index % 2 === 0;
            $interview = $interviews->schedule($application, [
                'type' => [InterviewType::Hr, InterviewType::Technical, InterviewType::Behavioral][$index % 3],
                'scheduled_at' => now()->addDays($index + 1)->setTime(9 + $index % 6, 0),
                'duration_minutes' => 60,
                'timezone' => $company->timezone,
                'meeting_url' => 'https://meet.example.test/'.Str::lower(Str::random(10)),
                'participant_ids' => [$interviewer->id, $recruiter->id],
                'force' => true,
            ], $recruiter);

            if ($past) {
                $interview->forceFill(['scheduled_at' => now()->subDays($index + 1)->setTime(10, 0)])->saveQuietly();
                foreach ([$interviewer, $recruiter] as $author) {
                    $interviews->submitFeedback($interview->refresh(), $author, [
                        'technical_score' => 3 + $index % 3,
                        'communication_score' => 4,
                        'problem_solving_score' => 3 + ($index + 1) % 3,
                        'overall_rating' => 3 + $index % 3,
                        'recommendation' => $index % 3 === 2 ? 'no_hire' : 'hire',
                        'comments' => 'Seeded example feedback.',
                    ]);
                }
            }
        }

        $offerStage = Application::query()->where('status', 'active')
            ->whereHas('stage', fn ($q) => $q->where('type', 'offer'))
            ->get();

        foreach ($offerStage as $index => $application) {
            $offer = $offers->create($application, [
                'salary_amount' => 55000 + $index * 5000,
                'currency' => 'EUR',
                'contract_type' => 'full_time',
                'start_date' => now()->addWeeks(6)->toDateString(),
                'expires_at' => now()->addDays(10),
                'message' => 'We are delighted to offer you this position.',
            ], $recruiter);

            if ($index % 3 >= 1) {
                $offers->submitForApproval($offer);
                $offer = $offers->approve($offer->refresh(), $hr, 'Within budget.');
            }
            if ($index % 3 === 2) {
                $offers->send($offer->refresh(), $hr);
            }
        }
    }

    /** candidate@example.test: a portal account linked to a candidate with a sent offer. */
    private function seedCandidatePortalAccount(string $hashedPassword): void
    {
        $sent = Offer::withoutGlobalScopes()->where('status', 'sent')->first();
        if ($sent === null || User::query()->where('email', 'candidate@example.test')->exists()) {
            return;
        }

        $user = $this->user('Demo Candidate', 'candidate@example.test', $hashedPassword);
        $user->grantPlatformRole(SystemRole::Candidate);

        $application = Application::withoutGlobalScopes()->findOrFail($sent->application_id);
        Candidate::withoutGlobalScopes()->whereKey($application->candidate_id)->update([
            'email' => 'candidate@example.test',
            'first_name' => 'Demo',
            'last_name' => 'Candidate',
            'user_id' => $user->id,
        ]);
    }
}
