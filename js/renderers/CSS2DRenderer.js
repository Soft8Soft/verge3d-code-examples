/**
 * @author mrdoob / http://mrdoob.com/
 */

v3d.CSS2DObject = function(element) {

    v3d.Object3D.call(this);

    this.element = element;
    this.element.style.position = 'absolute';

    this.addEventListener('removed', function(event) {

        if (this.element.parentNode !== null) {

            this.element.parentNode.removeChild(this.element);

        }

    });

};

v3d.CSS2DObject.prototype = Object.create(v3d.Object3D.prototype);
v3d.CSS2DObject.prototype.constructor = v3d.CSS2DObject;

//

v3d.CSS2DRenderer = function() {

    console.log('v3d.CSS2DRenderer', v3d.REVISION);

    var _width, _height;
    var _widthHalf, _heightHalf;

    var vector = new v3d.Vector3();
    var viewMatrix = new v3d.Matrix4();
    var viewProjectionMatrix = new v3d.Matrix4();

    var domElement = document.createElement('div');
    domElement.style.overflow = 'hidden';

    this.domElement = domElement;

    this.setSize = function(width, height) {

        _width = width;
        _height = height;

        _widthHalf = _width / 2;
        _heightHalf = _height / 2;

        domElement.style.width = width + 'px';
        domElement.style.height = height + 'px';

    };

    var renderObject = function(object, camera) {

        if (object instanceof v3d.CSS2DObject) {

            vector.setFromMatrixPosition(object.matrixWorld);
            vector.applyMatrix4(viewProjectionMatrix);

            var element = object.element;
            var style = 'translate(-50%,-50%) translate(' + (vector.x * _widthHalf + _widthHalf) + 'px,' + (- vector.y * _heightHalf + _heightHalf) + 'px)';

            element.style.WebkitTransform = style;
            element.style.MozTransform = style;
            element.style.oTransform = style;
            element.style.transform = style;

            if (element.parentNode !== domElement) {

                domElement.appendChild(element);

            }

        }

        for (var i = 0, l = object.children.length; i < l; i++) {

            renderObject(object.children[i], camera);

        }

    };

    this.render = function(scene, camera) {

        scene.updateMatrixWorld();

        if (camera.parent === null) camera.updateMatrixWorld();

        viewMatrix.copy(camera.matrixWorldInverse);
        viewProjectionMatrix.multiplyMatrices(camera.projectionMatrix, viewMatrix);

        renderObject(scene, camera);

    };

};
