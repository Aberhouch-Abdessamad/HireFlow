<?php

namespace App\Http\Controllers\Api\V1\Notifications;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\NotificationResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * The signed-in user's personal in-app notification feed. No permission gate:
 * every authenticated member only ever sees their own notifications.
 */
final class NotificationController extends Controller
{
    /** GET /notifications?unread=1&per_page=20 */
    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'unread' => ['nullable', 'boolean'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $user = $request->user();
        $query = ($validated['unread'] ?? false)
            ? $user->unreadNotifications()
            : $user->notifications();

        return NotificationResource::collection($query->paginate($validated['per_page'] ?? 20))
            ->additional(['meta' => ['unread_count' => $user->notifications()->unread()->count()]]);
    }

    /** POST /notifications/{id}/read — mark one notification as read. */
    public function read(Request $request, string $id): JsonResponse
    {
        $notification = $request->user()->notifications()->whereKey($id)->firstOrFail();
        $notification->markAsRead();

        return response()->json(['data' => new NotificationResource($notification->refresh())]);
    }

    /** POST /notifications/read-all — mark every notification as read. */
    public function readAll(Request $request): JsonResponse
    {
        $marked = $request->user()->unreadNotifications()->update(['read_at' => now()]);

        return response()->json(['data' => ['marked_read' => $marked]]);
    }
}
