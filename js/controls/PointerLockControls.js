/**
 * @author mrdoob / http://mrdoob.com/
 * @author Mugen87 / https://github.com/Mugen87
 */

v3d.PointerLockControls = function(camera, domElement) {

    var scope = this;

    this.domElement = domElement || document.body;
    this.isLocked = false;

    camera.rotation.set(0, 0, 0);

    var pitchObject = new v3d.Object3D();
    pitchObject.add(camera);

    var yawObject = new v3d.Object3D();
    yawObject.position.y = 10;
    yawObject.add(pitchObject);

    var PI_2 = Math.PI / 2;

    function onMouseMove(event) {

        if (scope.isLocked === false) return;

        var movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        var movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

        yawObject.rotation.y -= movementX * 0.002;
        pitchObject.rotation.x -= movementY * 0.002;

        pitchObject.rotation.x = Math.max(- PI_2, Math.min(PI_2, pitchObject.rotation.x));

    }

    function onPointerlockChange() {

        if (document.pointerLockElement === scope.domElement) {

            scope.dispatchEvent({ type: 'lock' });

            scope.isLocked = true;

        } else {

            scope.dispatchEvent({ type: 'unlock' });

            scope.isLocked = false;

        }

    }

    function onPointerlockError() {

        console.error('v3d.PointerLockControls: Unable to use Pointer Lock API');

    }

    this.connect = function() {

        document.addEventListener('mousemove', onMouseMove, false);
        document.addEventListener('pointerlockchange', onPointerlockChange, false);
        document.addEventListener('pointerlockerror', onPointerlockError, false);

    };

    this.disconnect = function() {

        document.removeEventListener('mousemove', onMouseMove, false);
        document.removeEventListener('pointerlockchange', onPointerlockChange, false);
        document.removeEventListener('pointerlockerror', onPointerlockError, false);

    };

    this.dispose = function() {

        this.disconnect();

    };

    this.getObject = function() {

        return yawObject;

    };

    this.getDirection = function() {

        // assumes the camera itself is not rotated

        var direction = new v3d.Vector3(0, 0, - 1);
        var rotation = new v3d.Euler(0, 0, 0, 'YXZ');

        return function(v) {

            rotation.set(pitchObject.rotation.x, yawObject.rotation.y, 0);

            v.copy(direction).applyEuler(rotation);

            return v;

        };

    }();

    this.lock = function() {

        this.domElement.requestPointerLock();

    };

    this.unlock = function() {

        document.exitPointerLock();

    };

    this.connect();

};

v3d.PointerLockControls.prototype = Object.create(v3d.EventDispatcher.prototype);
v3d.PointerLockControls.prototype.constructor = v3d.PointerLockControls;
