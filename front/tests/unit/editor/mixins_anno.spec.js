import { AnnoPanel } from "../../../src/editor/mixins";

const { getAPIAnnotationBody } = AnnoPanel.methods;

function makeCtx(partPk = 1) {
    return {
        $store: { state: { parts: { pk: partPk } } },
    };
}

describe("AnnoPanel.getAPIAnnotationBody", () => {
    it("returns null taxonomy when annotation has none", () => {
        const ctx = makeCtx();
        const annotation = { taxonomy: null, body: [] };
        const result = getAPIAnnotationBody.call(ctx, annotation);
        expect(result.taxonomy).toBeNull();
    });

    it("returns the taxonomy pk when taxonomy is set", () => {
        const ctx = makeCtx();
        const annotation = {
            taxonomy: { pk: 42, components: [] },
            body: [],
        };
        const result = getAPIAnnotationBody.call(ctx, annotation);
        expect(result.taxonomy).toBe(42);
    });

    it("sets part from the store", () => {
        const ctx = makeCtx(7);
        const annotation = { taxonomy: null, body: [] };
        const result = getAPIAnnotationBody.call(ctx, annotation);
        expect(result.part).toBe(7);
    });

    it("collects comment body values into comments array", () => {
        const ctx = makeCtx();
        const annotation = {
            taxonomy: null,
            body: [
                { purpose: "commenting", value: "nice" },
                { purpose: "commenting", value: "good" },
                { purpose: "tagging", value: "ignore-me" },
            ],
        };
        const result = getAPIAnnotationBody.call(ctx, annotation);
        expect(result.comments).toEqual(["nice", "good"]);
    });

    it("returns empty comments when there are no commenting bodies", () => {
        const ctx = makeCtx();
        const annotation = { taxonomy: null, body: [] };
        expect(getAPIAnnotationBody.call(ctx, annotation).comments).toEqual([]);
    });

    it("maps attribute bodies to component pk/value pairs", () => {
        const ctx = makeCtx();
        const annotation = {
            taxonomy: {
                pk: 1,
                components: [
                    { pk: 10, name: "color" },
                    { pk: 11, name: "size" },
                ],
            },
            body: [
                { purpose: "attribute-color", value: "red" },
                { purpose: "attribute-size", value: "large" },
            ],
        };
        const result = getAPIAnnotationBody.call(ctx, annotation);
        expect(result.components).toEqual([
            { component: 10, value: "red" },
            { component: 11, value: "large" },
        ]);
    });

    it("returns empty components when body has no attribute entries", () => {
        const ctx = makeCtx();
        const annotation = {
            taxonomy: { pk: 1, components: [{ pk: 10, name: "color" }] },
            body: [{ purpose: "commenting", value: "hello" }],
        };
        expect(getAPIAnnotationBody.call(ctx, annotation).components).toEqual([]);
    });
});
