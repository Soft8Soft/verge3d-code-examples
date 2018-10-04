/**
 * @author alteredq / http://alteredqualia.com/
 */

v3d.Gyroscope = function() {

    v3d.Object3D.call(this);

};

v3d.Gyroscope.prototype = Object.create(v3d.Object3D.prototype);
v3d.Gyroscope.prototype.constructor = v3d.Gyroscope;

v3d.Gyroscope.prototype.updateMatrixWorld = (function() {

    var translationObject = new v3d.Vector3();
    var quaternionObject = new v3d.Quaternion();
    var scaleObject = new v3d.Vector3();

    var translationWorld = new v3d.Vector3();
    var quaternionWorld = new v3d.Quaternion();
    var scaleWorld = new v3d.Vector3();

    return function updateMatrixWorld(force) {

        this.matrixAutoUpdate && this.updateMatrix();

        // update matrixWorld

        if (this.matrixWorldNeedsUpdate || force) {

            if (this.parent !== null) {

                this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix);

                this.matrixWorld.decompose(translationWorld, quaternionWorld, scaleWorld);
                this.matrix.decompose(translationObject, quaternionObject, scaleObject);

                this.matrixWorld.compose(translationWorld, quaternionObject, scaleWorld);


            } else {

                this.matrixWorld.copy(this.matrix);

            }


            this.matrixWorldNeedsUpdate = false;

            force = true;

        }

        // update children

        for (var i = 0, l = this.children.length; i < l; i++) {

            this.children[i].updateMatrixWorld(force);

        }

    };

}());
