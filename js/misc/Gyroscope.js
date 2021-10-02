(function() {

    const _translationObject = new v3d.Vector3();

    const _quaternionObject = new v3d.Quaternion();

    const _scaleObject = new v3d.Vector3();

    const _translationWorld = new v3d.Vector3();

    const _quaternionWorld = new v3d.Quaternion();

    const _scaleWorld = new v3d.Vector3();

    class Gyroscope extends v3d.Object3D {

        constructor() {

            super();

        }

        updateMatrixWorld(force) {

            this.matrixAutoUpdate && this.updateMatrix(); // update matrixWorld

            if (this.matrixWorldNeedsUpdate || force) {

                if (this.parent !== null) {

                    this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix);
                    this.matrixWorld.decompose(_translationWorld, _quaternionWorld, _scaleWorld);
                    this.matrix.decompose(_translationObject, _quaternionObject, _scaleObject);
                    this.matrixWorld.compose(_translationWorld, _quaternionObject, _scaleWorld);

                } else {

                    this.matrixWorld.copy(this.matrix);

                }

                this.matrixWorldNeedsUpdate = false;
                force = true;

            } // update children


            for (let i = 0, l = this.children.length; i < l; i++) {

                this.children[i].updateMatrixWorld(force);

            }

        }

    }

    v3d.Gyroscope = Gyroscope;

})();
