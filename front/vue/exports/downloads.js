import Vue from "vue";
import Downloads from "../pages/Downloads/Downloads.vue";

new Vue({
    el: "#vue-downloads",
    components: { Downloads },
    render: (h) => h(Downloads),
});
