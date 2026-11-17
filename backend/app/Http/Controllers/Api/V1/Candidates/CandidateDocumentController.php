<?php

namespace App\Http\Controllers\Api\V1\Candidates;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Candidates\UploadDocumentRequest;
use App\Http\Resources\V1\CandidateDocumentResource;
use App\Models\Candidate;
use App\Models\CandidateDocument;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Services\Candidates\CandidateService;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CandidateDocumentController extends Controller
{
    public function __construct(private readonly CandidateService $candidates) {}

    /** POST /candidates/{candidate}/documents (multipart: file, type) */
    public function store(UploadDocumentRequest $request, Candidate $candidate): CandidateDocumentResource
    {
        Gate::authorize('update', $candidate);

        /** @var User $actor */
        $actor = $request->user();
        $document = $this->candidates->storeDocument($candidate, $request->file('file'), $request->input('type', 'cv'), $actor);

        return new CandidateDocumentResource($document->load('uploader'));
    }

    /**
     * GET /candidates/{candidate}/documents/{document}/download
     *
     * Files are streamed from private storage after authorization. Both bindings are already
     * filtered to the active company; the document must also belong to the given candidate.
     */
    public function download(Candidate $candidate, CandidateDocument $document, AuditLogger $audit): StreamedResponse
    {
        Gate::authorize('view', $candidate);
        abort_unless((int) $document->candidate_id === $candidate->id, 404);

        $disk = Storage::disk(CandidateDocument::DISK);
        abort_unless($disk->exists($document->path), 404);

        $audit->record('candidate.document_downloaded', $document);

        return $disk->download($document->path, $document->original_name, [
            'Content-Type' => $document->mime_type,
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store',
        ]);
    }

    /** DELETE /candidates/{candidate}/documents/{document} */
    public function destroy(Candidate $candidate, CandidateDocument $document): Response
    {
        Gate::authorize('update', $candidate);
        abort_unless((int) $document->candidate_id === $candidate->id, 404);

        $this->candidates->deleteDocument($document);

        return response()->noContent();
    }
}
