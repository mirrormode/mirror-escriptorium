jest.mock("../../../src/editor/api");

import { initialState, mutations, actions } from "../../../src/editor/store/text_annotations";
import * as api from "../../../src/editor/api";

describe("text_annotations store", () => {
    // -----------------------------------------------------------------------
    // mutations
    // -----------------------------------------------------------------------
    describe("mutations", () => {
        describe("set", () => {
            it("replaces state.all with annotations marked loaded", () => {
                const state = initialState();
                mutations.set(state, [
                    { pk: 1, start_offset: 0 },
                    { pk: 2, start_offset: 5 },
                ]);
                expect(state.all).toHaveLength(2);
                expect(state.all[0]).toMatchObject({ pk: 1, loaded: true });
                expect(state.all[1]).toMatchObject({ pk: 2, loaded: true });
            });
        });

        describe("append", () => {
            it("pushes a new annotation with loaded: false", () => {
                const state = initialState();
                mutations.append(state, { pk: 7, start_offset: 3 });
                expect(state.all).toHaveLength(1);
                expect(state.all[0]).toMatchObject({ pk: 7, loaded: false });
            });
        });

        describe("load", () => {
            it("marks the matching annotation as loaded", () => {
                const state = { all: [{ pk: 3, loaded: false }, { pk: 4, loaded: false }] };
                mutations.load(state, 3);
                expect(state.all[0].loaded).toBe(true);
                expect(state.all[1].loaded).toBe(false);
            });
        });

        describe("remove", () => {
            it("removes the annotation with the given pk", () => {
                const state = { all: [{ pk: 1 }, { pk: 2 }, { pk: 3 }] };
                mutations.remove(state, 2);
                expect(state.all.map((a) => a.pk)).toEqual([1, 3]);
            });

            it("does nothing when pk is not found", () => {
                const state = { all: [{ pk: 1 }] };
                mutations.remove(state, 99);
                expect(state.all).toHaveLength(1);
            });
        });

        describe("reset", () => {
            it("restores state to initial values", () => {
                const state = { all: [{ pk: 1 }] };
                mutations.reset(state);
                expect(state).toEqual(initialState());
            });
        });
    });

    // -----------------------------------------------------------------------
    // actions
    // -----------------------------------------------------------------------
    describe("actions", () => {
        let commit, rootState;

        beforeEach(() => {
            commit = jest.fn();
            rootState = {
                document: { id: 42 },
                parts: { pk: 7 },
                transcriptions: { selectedTranscription: 3 },
            };
        });

        describe("create", () => {
            it("calls createTextAnnotation with document/part ids and data", async () => {
                api.createTextAnnotation = jest.fn().mockResolvedValue({
                    data: { pk: 99, start_offset: 0, end_offset: 5 },
                });
                const annotation = { start_offset: 0, end_offset: 5 };

                await actions.create({ commit, rootState }, annotation);

                expect(api.createTextAnnotation).toHaveBeenCalledWith(42, 7, annotation);
            });

            it("commits append with the server response data", async () => {
                const serverAnnotation = { pk: 99, start_offset: 0, end_offset: 5 };
                api.createTextAnnotation = jest.fn().mockResolvedValue({
                    data: serverAnnotation,
                });

                await actions.create({ commit, rootState }, {});

                expect(commit).toHaveBeenCalledWith("append", serverAnnotation);
            });

            it("returns the server annotation", async () => {
                const serverAnnotation = { pk: 99 };
                api.createTextAnnotation = jest.fn().mockResolvedValue({
                    data: serverAnnotation,
                });

                const result = await actions.create({ commit, rootState }, {});
                expect(result).toEqual(serverAnnotation);
            });
        });

        describe("update", () => {
            it("calls updateTextAnnotation with correct args", async () => {
                const serverAnnotation = { pk: 5, start_offset: 2 };
                api.updateTextAnnotation = jest.fn().mockResolvedValue({
                    data: serverAnnotation,
                });
                const annotation = { id: 5, start_offset: 2, end_offset: 8 };

                await actions.update({ commit, rootState }, annotation);

                expect(api.updateTextAnnotation).toHaveBeenCalledWith(
                    42, 7, 5, annotation,
                );
            });

            it("returns the updated annotation from the server", async () => {
                const serverAnnotation = { pk: 5, start_offset: 2 };
                api.updateTextAnnotation = jest.fn().mockResolvedValue({
                    data: serverAnnotation,
                });

                const result = await actions.update(
                    { commit, rootState },
                    { id: 5 },
                );
                expect(result).toEqual(serverAnnotation);
            });
        });

        describe("delete", () => {
            it("calls deleteTextAnnotation with correct args", async () => {
                api.deleteTextAnnotation = jest.fn().mockResolvedValue({});

                await actions.delete({ commit, rootState }, 5);

                expect(api.deleteTextAnnotation).toHaveBeenCalledWith(42, 7, 5);
            });

            it("commits remove with the annotation pk", async () => {
                api.deleteTextAnnotation = jest.fn().mockResolvedValue({});

                await actions.delete({ commit, rootState }, 5);

                expect(commit).toHaveBeenCalledWith("remove", 5);
            });
        });

        describe("fetch", () => {
            it("fetches all pages and commits set with the full result", async () => {
                api.retrieveTextAnnotations = jest.fn()
                    .mockResolvedValueOnce({
                        data: { results: [{ pk: 1 }, { pk: 2 }], next: true },
                    })
                    .mockResolvedValueOnce({
                        data: { results: [{ pk: 3 }], next: null },
                    });

                const result = await actions.fetch({ commit, rootState });

                expect(api.retrieveTextAnnotations).toHaveBeenCalledTimes(2);
                expect(api.retrieveTextAnnotations).toHaveBeenNthCalledWith(
                    1, 42, 7, 3, 1,
                );
                expect(api.retrieveTextAnnotations).toHaveBeenNthCalledWith(
                    2, 42, 7, 3, 2,
                );
                expect(commit).toHaveBeenCalledWith("set", [{ pk: 1 }, { pk: 2 }, { pk: 3 }]);
                expect(result).toEqual([{ pk: 1 }, { pk: 2 }, { pk: 3 }]);
            });
        });
    });
});
