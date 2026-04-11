/**
 * Tests for SegPanel segmentation race-condition fixes.
 *
 * Bug 1 — Double line creation:
 *   When the user draws a line and immediately moves it before the bulkCreate
 *   server response arrives, the line (context.pk === null) is queued again
 *   and a second creation request fires, producing a duplicate on the server.
 *   Fix: pendingContexts Set marks in-flight creates; the toCreate filter
 *   excludes them until their pk is received.
 *
 * Bug 3 — Undo while creation is in flight:
 *   pushHistory was called immediately (before awaiting bulkCreate), so the
 *   undo closure captured lines with context.pk === null. Undoing immediately
 *   called bulkDelete(pk=null), which did nothing on the server but removed
 *   the line from the UI, leaving a zombie on the server.
 *   Fix: the handler is now async and awaits both bulkCreate and bulkUpdate
 *   before calling pushHistory.
 */

// SegPanel's data() references globals that are only available in the bundled
// runtime. Stub the minimum set needed for the data() test.
global.UndoManager = class { setCallback() {} };
global.userProfile = { get: jest.fn(() => null), set: jest.fn() };

import SegPanel from "../../../vue/components/SegPanel.vue";

const methods = SegPanel.options ? SegPanel.options.methods : SegPanel.methods;
const dataFn  = SegPanel.options ? SegPanel.options.data   : SegPanel.data;

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeCtx({ onCreate } = {}) {
    const ctx = {
        pendingContexts: new Set(),
        bulkCreate: jest.fn().mockImplementation(async (toCreate) => {
            if (onCreate) onCreate(toCreate);
        }),
        bulkUpdate: jest.fn().mockResolvedValue([]),
        pushHistory: jest.fn(),
        extractPrevious: jest.fn(),
        bulkDelete: jest.fn().mockResolvedValue([]),
    };
    return ctx;
}

function makeSnap(pk) {
    const context = { pk };
    return { context, baseline: [[0,0],[1,1]], mask: null, region: null, type: null };
}

// ─── pendingContexts (Bug 1) ──────────────────────────────────────────────────

describe("SegPanel pendingContexts guard (Bug 1 — double-line creation)", () => {
    it("is initialised as an empty Set in data()", () => {
        const data = dataFn.call({ legacyModeEnabled: false });
        expect(data.pendingContexts).toBeInstanceOf(Set);
        expect(data.pendingContexts.size).toBe(0);
    });

    it("adds line contexts to pendingContexts before bulkCreate is called", async () => {
        let pendingSizeAtCreateTime = null;
        const ctx = makeCtx({
            onCreate: () => {
                pendingSizeAtCreateTime = ctx.pendingContexts.size;
            },
        });

        await methods.handleBaselineUpdate.call(ctx, {
            lines: [makeSnap(null)],
            regions: [],
        });

        expect(pendingSizeAtCreateTime).toBe(1);
    });

    it("does not re-submit a line whose context is already pending", async () => {
        const ctx = makeCtx();
        const snap = makeSnap(null);

        // Simulate the context already being in-flight from a prior frame.
        ctx.pendingContexts.add(snap.context);

        await methods.handleBaselineUpdate.call(ctx, {
            lines: [snap],
            regions: [],
        });

        const [toCreate] = ctx.bulkCreate.mock.calls[0];
        expect(toCreate.lines).toHaveLength(0);
    });

    it("routes a line with a real pk to toUpdate, not toCreate", async () => {
        const ctx = makeCtx();
        const snap = makeSnap(42);
        snap.previous = makeSnap(42);

        await methods.handleBaselineUpdate.call(ctx, {
            lines: [snap],
            regions: [],
        });

        const [toCreate] = ctx.bulkCreate.mock.calls[0];
        expect(toCreate.lines).toHaveLength(0);

        const [toUpdate] = ctx.bulkUpdate.mock.calls[0];
        expect(toUpdate.lines).toHaveLength(1);
        expect(toUpdate.lines[0].context.pk).toBe(42);
    });

    it("removes the context from pendingContexts once bulkCreate assigns a pk", async () => {
        const ctx = makeCtx({
            onCreate: (toCreate) => {
                // Simulate what the real bulkCreate does when the server responds.
                toCreate.lines.forEach((l) => {
                    ctx.pendingContexts.delete(l.context);
                    l.context.pk = 99;
                });
            },
        });

        const snap = makeSnap(null);
        await methods.handleBaselineUpdate.call(ctx, {
            lines: [snap],
            regions: [],
        });

        expect(ctx.pendingContexts.has(snap.context)).toBe(false);
        expect(snap.context.pk).toBe(99);
    });
});

// ─── await before pushHistory (Bug 3) ────────────────────────────────────────

describe("SegPanel await before pushHistory (Bug 3 — undo while creation in flight)", () => {
    it("does not call pushHistory before bulkCreate resolves", async () => {
        let resolveCreate;
        const ctx = makeCtx();
        ctx.bulkCreate = jest.fn(
            () => new Promise((res) => { resolveCreate = res; }),
        );

        const snap = makeSnap(null);
        const handlerPromise = methods.handleBaselineUpdate.call(ctx, {
            lines: [snap],
            regions: [],
        });

        // bulkCreate is still pending — pushHistory must not have been called yet.
        expect(ctx.pushHistory).not.toHaveBeenCalled();

        resolveCreate();
        await handlerPromise;

        expect(ctx.pushHistory).toHaveBeenCalledTimes(1);
    });

    it("calls bulkCreate before pushHistory (verified via invocation order)", async () => {
        const order = [];
        const ctx = makeCtx();
        ctx.bulkCreate = jest.fn().mockImplementation(async () => {
            order.push("bulkCreate");
        });
        ctx.bulkUpdate = jest.fn().mockImplementation(async () => {
            order.push("bulkUpdate");
        });
        ctx.pushHistory = jest.fn(() => order.push("pushHistory"));

        await methods.handleBaselineUpdate.call(ctx, {
            lines: [makeSnap(null)],
            regions: [],
        });

        expect(order).toEqual(["bulkCreate", "bulkUpdate", "pushHistory"]);
    });

    it("undo closure sees a real pk once pushHistory is called", async () => {
        const ctx = makeCtx({
            onCreate: (toCreate) => {
                toCreate.lines.forEach((l) => { l.context.pk = 77; });
            },
        });

        let capturedUndo;
        ctx.pushHistory = jest.fn((undo) => { capturedUndo = undo; });

        const snap = makeSnap(null);
        await methods.handleBaselineUpdate.call(ctx, {
            lines: [snap],
            regions: [],
        });

        // By the time pushHistory is called, the pk must already be set.
        expect(snap.context.pk).toBe(77);
        expect(typeof capturedUndo).toBe("function");
    });
});
