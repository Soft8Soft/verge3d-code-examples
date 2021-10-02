(function() {

    class MorphAnimMesh extends v3d.Mesh {

        constructor(geometry, material) {

            super(geometry, material);
            this.type = 'MorphAnimMesh';
            this.mixer = new v3d.AnimationMixer(this);
            this.activeAction = null;

        }

        setDirectionForward() {

            this.mixer.timeScale = 1.0;

        }

        setDirectionBackward() {

            this.mixer.timeScale = - 1.0;

        }

        playAnimation(label, fps) {

            if (this.activeAction) {

                this.activeAction.stop();
                this.activeAction = null;

            }

            const clip = v3d.AnimationClip.findByName(this, label);

            if (clip) {

                const action = this.mixer.clipAction(clip);
                action.timeScale = clip.tracks.length * fps / clip.duration;
                this.activeAction = action.play();

            } else {

                throw new Error('v3d.MorphAnimMesh: animations[' + label + '] undefined in .playAnimation()');

            }

        }

        updateAnimation(delta) {

            this.mixer.update(delta);

        }

        copy(source) {

            super.copy(source);
            this.mixer = new v3d.AnimationMixer(this);
            return this;

        }

    }

    v3d.MorphAnimMesh = MorphAnimMesh;

})();
