import * as THREE from 'three';
import { Lensflare, LensflareElement } from './Lensflare.js';

import metaversefile from 'metaversefile';
import {Cloud} from './cloud.js';
import {Sky} from './sky.js';

const {useApp, useFrame, useInternals, useLocalPlayer, useSkyManager} = metaversefile;
const baseUrl = import.meta.url.replace(/(\/)[^\/\\]*$/, '$1');
const textureLoader = new THREE.TextureLoader();

const cloudTexture1 = textureLoader.load(baseUrl + `./textures/cloud1.png`);
const cloudTexture2 = textureLoader.load(baseUrl + `./textures/cloud2.png`);
const cloudTexture3 = textureLoader.load(baseUrl + `./textures/cloud3.png`);
const cloudTexture4 = textureLoader.load(baseUrl + `./textures/cloud4.png`);

const moonTexture = textureLoader.load(baseUrl + `./textures/moon2.png`);

const starTexture = textureLoader.load(baseUrl + `./textures/star3.png`);
starTexture.wrapS = starTexture.wrapT = THREE.RepeatWrapping;
const noiseTexture = textureLoader.load(baseUrl + `./textures/noise.png`);
noiseTexture.wrapS = noiseTexture.wrapT = THREE.RepeatWrapping;

const galaxyTexture = textureLoader.load(baseUrl + `./textures/galaxy.png`);

const noiseTexture2 = textureLoader.load(baseUrl + `./textures/noise2.png`);
noiseTexture2.wrapS = noiseTexture2.wrapT = THREE.RepeatWrapping;

const textureFlare0 = textureLoader.load(baseUrl + `./textures/Flare32.png`);
const textureFlare3 = textureLoader.load(baseUrl + `./textures/lensflare3.png`);



export default () => {
  const app = useApp();
  const {camera} = useInternals();
  const localPlayer = useLocalPlayer();

  const skyManager = useSkyManager();
  
  // ######################################## set component ################################################################
  let skylightSpeed = 1;
  let defaultSkyLightPosition = new THREE.Vector3(0, 0, 0);
  const _setSkyLight = (value) => {
    value.position && defaultSkyLightPosition.set(value.position[0], value.position[1], value.position[2]);
    skylightSpeed = value.speed;
  }

  const ambientLight = new THREE.AmbientLight('#fff', 0.5);
  app.add(ambientLight);
  const _setAmbientLight = (value) => {
    const args = value.args;
    ambientLight.color.set(ambientLight.color.fromArray(args[0]).multiplyScalar(1 / 255).getHex());
    ambientLight.intensity = args[1];
  }

  const _setHemisphereLight = (value) => {
    const args = value.args;
    const hemiLight = new THREE.HemisphereLight(
      new THREE.Color().fromArray(args[0]).multiplyScalar(1 / 255).getHex(), 
      new THREE.Color().fromArray(args[1]).multiplyScalar(1 / 255).getHex(), 
      args[2] 
    );
    hemiLight.position.set(value.position[0], value.position[1], value.position[2]);
    app.add(hemiLight);
  }

  let sunColor = new THREE.Color(0xffffff);
  let sunColorHex = '#' + sunColor.getHexString();
  let sunIntensity = 6;
  const _setSunLight = (value) => {
    const args = value.args;
    sunColorHex = '#' + sunColor.fromArray(args[0]).multiplyScalar(1 / 255).getHexString();
    sunIntensity = args[1];
  }

  let moonColor = new THREE.Color(0x98caf5);
  let moonColorHex = '#' + moonColor.getHexString();
  let moonIntensity = 2;
  const _setMoonLight = (value) => {
    const args = value.args;
    moonColorHex = '#' + moonColor.fromArray(args[0]).multiplyScalar(1 / 255).getHexString();
    moonIntensity = args[1];
  }

  for (const component of app.components) {
    switch (component.key) {
      case 'skyLight': {
        _setSkyLight(component.value)
        break;
      }
      case 'ambientLight': {
        _setAmbientLight(component.value)
        break;
      }
      case 'hemisphereLight': {
        _setHemisphereLight(component.value)
        break;
      }
      case 'sunLight': {
        _setSunLight(component.value)
        break;
      }
      case 'moonLight': {
        _setMoonLight(component.value)
        break;
      }
      default: {
        break;
      }
    }
  }

  skyManager.initSkyLight();
  const skyLight = skyManager.getSkyLight();

  app.add(skyLight);
  app.add(skyLight.target);

  //############################################################## sun position ##############################################################
  let azimuth = 0.4;
  const inclination = 0.;
  const sunPosition = new THREE.Vector3();
  const skyLightPosition = new THREE.Vector3();
  useFrame(() => {
    // ?* moves the skybox app so that player never passes the skybox's walls
    app.position.copy(localPlayer.position);
    azimuth = (0.05 + (Date.now() / 5000) * 0.1 * skylightSpeed) % 1;
    const theta = Math.PI * (inclination - 0.5);
    const phi = 2 * Math.PI * (azimuth - 0.5);

    sunPosition.set(
      Math.cos(phi),
      Math.sin(phi) * Math.sin(theta),
      Math.sin(phi) * Math.cos(theta)
    );
    if (azimuth < 0.5) {
      // sun
      skyLightPosition.copy(sunPosition);
      skyManager.setSkyLightColor(sunColorHex);
      skyManager.setSkyLightIntensity(sunIntensity);
    } else {
      // moon
      skyLightPosition.copy(sunPosition).multiplyScalar(-1);
      skyManager.setSkyLightColor(moonColorHex);
      skyManager.setSkyLightIntensity(moonIntensity);
    }

    skyManager.setSkyLightPosition(skyLightPosition);
  });
  

  //############################################################## sky ##############################################################
  {
    const skyBoxRadius = 10000;
    const sunMoonRotationRadius = skyBoxRadius / 2;

    const sky = new Sky();
    app.add(sky);

    sky.material.uniforms.skyBoxRadius.value = skyBoxRadius;
    sky.material.uniforms.starTexture.value = starTexture;
    sky.material.uniforms.noiseTexture.value = noiseTexture;
    sky.material.uniforms.galaxyTexture.value = galaxyTexture;
    sky.material.uniforms.noiseTexture2.value = noiseTexture2;
    
    const moonGeometry = new THREE.PlaneGeometry( 500, 500 );
    const moonMaterial = new THREE.MeshBasicMaterial( { map: moonTexture, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true} );
    const moon = new THREE.Mesh(moonGeometry, moonMaterial);
    app.add( moon );

    const sun = new THREE.PointLight(0xffffff, 100, 2000);
    const lensflare = new Lensflare();
    const mainFlare = new LensflareElement(textureFlare0, 500, 0, sun.color, 0.2);
    lensflare.addElement(mainFlare);
    lensflare.addElement(new LensflareElement(textureFlare3, 60, 0.6));
    lensflare.addElement(new LensflareElement(textureFlare3, 70, 0.7));
    lensflare.addElement(new LensflareElement(textureFlare3, 120, 0.9));
    lensflare.addElement(new LensflareElement(textureFlare3, 70, 1));
    sun.add( lensflare );
    app.add( sun );
    sun.visible = false;

    useFrame(({timestamp}) => {
      const player = useLocalPlayer();
      // update sun
      if (azimuth < 0.5) {
        sun.visible = true;
        sun.position.set(sunPosition.x, sunPosition.y, sunPosition.z).multiplyScalar(sunMoonRotationRadius);
        mainFlare.rotation = camera.rotation.y;
      }
      else {
        sun.visible = false;
      }
      // update moon
      moon.position.set(sunPosition.x, sunPosition.y, sunPosition.z).multiplyScalar(-sunMoonRotationRadius);
      moon.rotation.copy(camera.rotation);
      
      // update sky
      sky.material.uniforms.sunPosition.value.set(sunPosition.x, sunPosition.y, sunPosition.z)
                                              .multiplyScalar(skyBoxRadius)
                                              .add(player.position);
      sky.material.uniforms.moonPosition.value.set(sunPosition.x, sunPosition.y, sunPosition.z)
                                              .multiplyScalar(-skyBoxRadius)
                                              .add(player.position);
      sky.material.uniforms.uTime.value = timestamp / 1000;
      
    });
    
  }
  //############################################################## cloud ##############################################################
  {
    const cloud = new Cloud();
    app.add(cloud);
    cloud.material.uniforms.noiseTexture2.value = noiseTexture2
    cloud.material.uniforms.cloudRadius.value = cloud.cloudRadius;
    cloud.material.uniforms.cloudTexture1.value = cloudTexture1;
    cloud.material.uniforms.cloudTexture2.value = cloudTexture2;
    cloud.material.uniforms.cloudTexture3.value = cloudTexture3;
    cloud.material.uniforms.cloudTexture4.value = cloudTexture4;
    useFrame(({timestamp}) => {
      const player = useLocalPlayer();
      
      cloud.material.uniforms.uTime.value = timestamp / 1000;
      cloud.material.uniforms.sunPosition.value.set(sunPosition.x * cloud.cloudRadius, sunPosition.y * cloud.cloudRadius, sunPosition.z * cloud.cloudRadius)
                                              .add(player.position);
      app.updateMatrixWorld();
    });
  }
  
  app.setComponent('renderPriority', 'high');
  
  return app;
};
