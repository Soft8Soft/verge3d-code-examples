(function() {

    class ReflectorRTT extends v3d.Reflector {

        constructor(geometry, options) {

            super(geometry, options);
            this.geometry.setDrawRange(0, 0); // avoid rendering geometry

        }

    }

    v3d.ReflectorRTT = ReflectorRTT;

})();
