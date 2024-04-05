/*
 Copyright 2022 Esri

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

import AppBase from "./support/AppBase.js";
import AppLoader from "./loaders/AppLoader.js";
import SignIn from './apl/SignIn.js';
import ViewLoading from './apl/ViewLoading.js';
import MapScale from './apl/MapScale.js';

class Application extends AppBase {

  // PORTAL //
  portal;

  constructor() {
    super();

    // LOAD APPLICATION BASE //
    super.load().then(() => {

      // APPLICATION LOADER //
      const applicationLoader = new AppLoader({app: this});
      applicationLoader.load().then(({portal, group, map, view}) => {
        //console.info(portal, group, map, view);

        // PORTAL //
        this.portal = portal;

        // SET APPLICATION DETAILS //
        this.setApplicationDetails({map, group});

        // STARTUP DIALOG //
        this.initializeStartupDialog();

        // VIEW SHAREABLE URL PARAMETERS //
        this.initializeViewShareable({view});

        // USER SIGN-IN //
        this.configUserSignIn();

        // APPLICATION //
        this.applicationReady({portal, group, map, view}).catch(this.displayError).then(() => {

          // HIDE APP LOADER //
          document.getElementById('app-loader').toggleAttribute('hidden', true);
        });

      }).catch(this.displayError);
    }).catch(this.displayError);

  }

  /**
   *
   */
  configUserSignIn() {

    const signInContainer = document.getElementById('sign-in-container');
    if (signInContainer) {
      const signIn = new SignIn({container: signInContainer, portal: this.portal});
    }

  }

  /**
   *
   * @param view
   */
  configView({view}) {
    return new Promise((resolve, reject) => {
      if (view) {
        require([
          'esri/core/reactiveUtils',
          'esri/widgets/Popup',
          'esri/widgets/Home',
          'esri/widgets/Search',
          'esri/widgets/Compass',
          'esri/widgets/Legend',
          'esri/widgets/LayerList'
        ], (reactiveUtils, Popup, Home, Search, Compass, Legend, LayerList) => {

          // VIEW AND POPUP //
          view.set({
            constraints: {snapToZoom: false},
            popup: new Popup({
              dockEnabled: true,
              dockOptions: {
                buttonEnabled: false,
                breakpoint: false,
                position: "top-right"
              }
            })
          });

          // SEARCH //
          const search = new Search({view: view});
          view.ui.add(search, {position: 'top-left', index: 0});

          // HOME //
          const home = new Home({view});
          view.ui.add(home, {position: 'top-left', index: 1});

          // COMPASS //
          const compass = new Compass({view: view});
          view.ui.add(compass, {position: 'top-left', index: 2});
          reactiveUtils.watch(() => view.rotation, rotation => {
            compass.set({visible: (rotation > 0)});
          }, {initial: true});

          // MAP SCALE //
          const mapScale = new MapScale({view});
          view.ui.add(mapScale, {position: 'bottom-left', index: 0});

          // VIEW LOADING INDICATOR //
          const viewLoading = new ViewLoading({view: view});
          view.ui.add(viewLoading, 'bottom-left');

          // LAYER LIST //
          const layerList = new LayerList({
            container: 'layers-container',
            view: view,
            visibleElements: {
              errors: true,
              statusIndicators: true
            }
          });

          // LEGEND //
          const legend = new Legend({
            container: 'legend-container',
            view: view  //basemapLegendVisible: true
          });
          //view.ui.add(legend, {position: 'bottom-left', index: 0});

          resolve();
        });
      } else { resolve(); }
    });
  }

  /**
   *
   * @param portal
   * @param group
   * @param map
   * @param view
   * @returns {Promise}
   */
  applicationReady({portal, group, map, view}) {
    return new Promise(async (resolve, reject) => {
      // VIEW READY //
      this.configView({view}).then(() => {

        this.initializeSketch({view});
        this.initializePopulationCountAnalysis({view});

        resolve();
      }).catch(reject);
    });
  }

  /**
   *
   * @param view
   */
  initializeSketch({view}) {
    require([
      'esri/core/reactiveUtils',
      'esri/layers/GraphicsLayer',
      'esri/widgets/Sketch'
    ], (reactiveUtils, GraphicsLayer, Sketch) => {

      const sketchLayer = new GraphicsLayer({title: 'Sketch'});
      view.map.add(sketchLayer);

      const sketch = new Sketch({
        view: view,
        layer: sketchLayer,
        visibleElements: {
          selectionTools: {"lasso-selection": false},
          settingsMenu: false
        },
        creationMode: 'update',
        availableCreateTools: ["polygon", "rectangle", "circle"]
      });
      view.ui.add(sketch, 'top-right');

      sketch.on([/*"create",*/ "update", "undo", "redo", "delete"], (event) => {
        //console.info(event.type);

        const polygon = event.graphics?.at(0).geometry || event.graphic?.geometry;

        switch (event.type) {
          /*case "create":
           if (event.state === "complete") {
           this.dispatchEvent(new CustomEvent('sketch-ready', {detail: {analysisArea: polygon}}));
           }
           break;*/
          case "update":
            switch (event.state) {
              case "start":
                this.dispatchEvent(new CustomEvent('sketch-ready', {detail: {analysisArea: polygon}}));
                break;
              case "active":
                if (event.toolEventInfo?.type.endsWith("-stop")) {
                  this.dispatchEvent(new CustomEvent('sketch-ready', {detail: {analysisArea: polygon}}));
                }
                break;
              case "complete":
                this.dispatchEvent(new CustomEvent('sketch-ready', {detail: {analysisArea: null}}));
                break;
            }
            break;
          case "undo":
          case "redo":
            this.dispatchEvent(new CustomEvent('sketch-ready', {detail: {analysisArea: polygon}}));
            break;
          case "delete":
            this.dispatchEvent(new CustomEvent('sketch-ready', {detail: {analysisArea: null}}));
            break;
        }

      });

    });
  }

  /**
   *
   * @param view
   */
  initializePopulationCountAnalysis({view}) {
    require([
      'esri/core/reactiveUtils',
      'esri/core/promiseUtils'
    ], (reactiveUtils, promiseUtils) => {

      const countFormatter = new Intl.NumberFormat('default', {minimumFractionDigits: 0, maximumFractionDigits: 0});

      const popCountLabel = document.getElementById('pop-count-label');

      const populationLayer = view.map.layers.find(layer => layer.title === 'Total Population 2020');
      populationLayer.load().then(() => {

        // GET SERVICE PIXEL SIZE //
        const {serviceRasterInfo: {pixelSize: servicePixelSize}} = populationLayer;

        let abortController = new AbortController();

        // GET POPULATION COUNT //
        const _getPopulationCount = promiseUtils.debounce(({analysisArea, signal}) => {
          return new Promise((resolve, reject) => {

            /*const viewPixelSize = {
             x: view.resolution,
             y: view.resolution,
             spatialReference: {wkid: view.spatialReference.wkid}
             };*/

            populationLayer.computeStatisticsHistograms({
              geometry: analysisArea,
              pixelSize: servicePixelSize
            }, {signal}).then(({histograms, statistics}) => {
              if (!signal.aborted) {
                resolve({stats: statistics.at(0)});
              }
            }).catch(reject);
          });
        });

        const handleAbortError = error => !promiseUtils.isAbortError(error) && this.displayError(error);

        // SKETCH CHANGES //
        this.addEventListener('sketch-ready', ({detail: {analysisArea}}) => {

          abortController.abort();
          abortController = new AbortController();

          if (analysisArea) {

            // GET POPULATION COUNT //
            _getPopulationCount({analysisArea, signal: abortController.signal}).then(({stats}) => {
              if (!abortController.signal.aborted) {

                // STATS //
                const {avg, count, max, mean, median, min, mode, standardDeviation, stddev, sum} = stats;

                // UPDATE LABEL //
                popCountLabel.innerHTML = countFormatter.format(sum);
              } else {
                // CLEAR LABEL //
                popCountLabel.innerHTML = "";
              }
            }).catch(handleAbortError);

          } else {
            // CLEAR LABEL //
            popCountLabel.innerHTML = "";
          }
        });

      });
    });
  }

}

export default new Application();
