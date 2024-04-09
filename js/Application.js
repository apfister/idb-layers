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
import SignIn from "./apl/SignIn.js";
import ViewLoading from "./apl/ViewLoading.js";
import MapScale from "./apl/MapScale.js";

class Application extends AppBase {
  // PORTAL //
  portal;

  constructor() {
    super();

    // LOAD APPLICATION BASE //
    super
      .load()
      .then(() => {
        // APPLICATION LOADER //
        const applicationLoader = new AppLoader({ app: this });
        applicationLoader
          .load()
          .then(({ portal, group, map, view }) => {
            //console.info(portal, group, map, view);

            // PORTAL //
            this.portal = portal;

            // SET APPLICATION DETAILS //
            this.setApplicationDetails({ map, group });

            // STARTUP DIALOG //
            // this.initializeStartupDialog();

            // VIEW SHAREABLE URL PARAMETERS //
            this.initializeViewShareable({ view });

            // USER SIGN-IN //
            this.configUserSignIn();

            // APPLICATION //
            this.applicationReady({ portal, group, map, view })
              .catch(this.displayError)
              .then(() => {
                // HIDE APP LOADER //
                document
                  .getElementById("app-loader")
                  .toggleAttribute("hidden", true);
              });
          })
          .catch(this.displayError);
      })
      .catch(this.displayError);
  }

  /**
   *
   */
  configUserSignIn() {
    const signInContainer = document.getElementById("sign-in-container");
    if (signInContainer) {
      const signIn = new SignIn({
        container: signInContainer,
        portal: this.portal,
      });
    }
  }

  /**
   *
   * @param view
   */
  configView({ view }) {
    return new Promise((resolve, reject) => {
      if (view) {
        require([
          "esri/core/reactiveUtils",
          "esri/widgets/Popup",
          "esri/widgets/Home",
          "esri/widgets/Search",
          "esri/widgets/Compass",
          "esri/widgets/Legend",
          "esri/widgets/LayerList",
        ], (reactiveUtils, Popup, Home, Search, Compass, Legend, LayerList) => {
          // VIEW AND POPUP //
          view.set({
            constraints: { snapToZoom: false },
            popup: new Popup({
              dockEnabled: true,
              dockOptions: {
                buttonEnabled: false,
                breakpoint: false,
                position: "top-right",
              },
            }),
          });

          // SEARCH //
          const search = new Search({ view: view });
          view.ui.add(search, { position: "top-left", index: 0 });

          // HOME //
          const home = new Home({ view });
          view.ui.add(home, { position: "top-left", index: 1 });

          // COMPASS //
          const compass = new Compass({ view: view });
          view.ui.add(compass, { position: "top-left", index: 2 });
          reactiveUtils.watch(
            () => view.rotation,
            (rotation) => {
              compass.set({ visible: rotation > 0 });
            },
            { initial: true }
          );

          // MAP SCALE //
          const mapScale = new MapScale({ view });
          view.ui.add(mapScale, { position: "bottom-left", index: 0 });

          // VIEW LOADING INDICATOR //
          const viewLoading = new ViewLoading({ view: view });
          view.ui.add(viewLoading, "bottom-left");

          // LAYER LIST //
          const layerList = new LayerList({
            container: "layers-container",
            view: view,
            visibleElements: {
              errors: true,
              statusIndicators: true,
            },
          });

          // LEGEND //
          const legend = new Legend({
            container: "legend-container",
            view: view, //basemapLegendVisible: true
          });
          //view.ui.add(legend, {position: 'bottom-left', index: 0});

          resolve();
        });
      } else {
        resolve();
      }
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
  applicationReady({ portal, group, map, view }) {
    return new Promise(async (resolve, reject) => {
      // VIEW READY //
      this.configView({ view })
        .then(() => {
          this.initializeSketch({ view });
          this.initializePopulationCountAnalysis({ view });
          this.initializeAFPLayerIntersectAnalysis({ view });

          resolve();
        })
        .catch(reject);
    });
  }

  /**
   *
   * @param view
   */
  initializeSketch({ view }) {
    require([
      "esri/core/reactiveUtils",
      "esri/layers/GraphicsLayer",
      "esri/widgets/Sketch",
    ], (reactiveUtils, GraphicsLayer, Sketch) => {
      const sketchLayer = new GraphicsLayer({ title: "Sketch" });
      view.map.add(sketchLayer);

      const sketch = new Sketch({
        view: view,
        layer: sketchLayer,
        visibleElements: {
          selectionTools: { "lasso-selection": false },
          settingsMenu: false,
        },
        creationMode: "update",
        availableCreateTools: ["polygon", "rectangle", "circle"],
      });
      view.ui.add(sketch, "top-right");

      sketch.on([/*"create",*/ "update", "undo", "redo", "delete"], (event) => {
        //console.info(event.type);

        const polygon =
          event.graphics?.at(0).geometry || event.graphic?.geometry;

        switch (event.type) {
          /*case "create":
           if (event.state === "complete") {
           this.dispatchEvent(new CustomEvent('sketch-ready', {detail: {analysisArea: polygon}}));
           }
           break;*/
          case "update":
            switch (event.state) {
              case "start":
                this.dispatchEvent(
                  new CustomEvent("sketch-ready", {
                    detail: { analysisArea: polygon },
                  })
                );
                break;
              case "active":
                if (event.toolEventInfo?.type.endsWith("-stop")) {
                  this.dispatchEvent(
                    new CustomEvent("sketch-ready", {
                      detail: { analysisArea: polygon },
                    })
                  );
                }
                break;
              case "complete":
                this.dispatchEvent(
                  new CustomEvent("sketch-ready", {
                    detail: { analysisArea: null },
                  })
                );
                break;
            }
            break;
          case "undo":
          case "redo":
            this.dispatchEvent(
              new CustomEvent("sketch-ready", {
                detail: { analysisArea: polygon },
              })
            );
            break;
          case "delete":
            this.dispatchEvent(
              new CustomEvent("sketch-ready", {
                detail: { analysisArea: null },
              })
            );
            break;
        }
      });
    });
  }

  /**
   *
   * @param view
   */
  initializePopulationCountAnalysis({ view }) {
    require(["esri/core/reactiveUtils", "esri/core/promiseUtils"], (
      reactiveUtils,
      promiseUtils
    ) => {
      const countFormatter = new Intl.NumberFormat("default", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });

      const popCountLabel = document.getElementById("pop-count-label");

      const populationLayer = view.map.layers.find(
        (layer) => layer.title === "Total Population 2020"
      );
      populationLayer.load().then(() => {
        // GET SERVICE PIXEL SIZE //
        const {
          serviceRasterInfo: { pixelSize: servicePixelSize },
        } = populationLayer;

        let abortController = new AbortController();

        // GET POPULATION COUNT //
        const _getPopulationCount = promiseUtils.debounce(
          ({ analysisArea, signal }) => {
            return new Promise((resolve, reject) => {
              /*const viewPixelSize = {
             x: view.resolution,
             y: view.resolution,
             spatialReference: {wkid: view.spatialReference.wkid}
             };*/

              populationLayer
                .computeStatisticsHistograms(
                  {
                    geometry: analysisArea,
                    pixelSize: servicePixelSize,
                  },
                  { signal }
                )
                .then(({ histograms, statistics }) => {
                  if (!signal.aborted) {
                    resolve({ stats: statistics.at(0) });
                  }
                })
                .catch(reject);
            });
          }
        );

        const handleAbortError = (error) => {
          if (!promiseUtils.isAbortError(error)) {
            if (
              error.details?.messages?.some(
                (message) =>
                  message === "The requested image exceeds the size limit."
              )
            ) {
              // handle the abort error
              error.details.messages[0] =
                "The Image Service does not support an area this large. Please zoom in and/or limit your drawing area.";
            }

            this.displayError(error);
          }
        };

        // SKETCH CHANGES //
        this.addEventListener(
          "sketch-ready",
          ({ detail: { analysisArea } }) => {
            abortController.abort();
            abortController = new AbortController();

            if (analysisArea) {
              // GET POPULATION COUNT //
              _getPopulationCount({
                analysisArea,
                signal: abortController.signal,
              })
                .then(({ stats }) => {
                  if (!abortController.signal.aborted) {
                    // STATS //
                    const {
                      avg,
                      count,
                      max,
                      mean,
                      median,
                      min,
                      mode,
                      standardDeviation,
                      stddev,
                      sum,
                    } = stats;

                    // UPDATE LABEL //
                    popCountLabel.innerHTML = countFormatter.format(sum);
                  } else {
                    // CLEAR LABEL //
                    popCountLabel.innerHTML = "";
                  }
                })
                .catch(handleAbortError);
            } else {
              // CLEAR LABEL //
              popCountLabel.innerHTML = "";
            }
          }
        );
      });
    });
  }

  udpateUIforIntersectLayers(afpLayers) {
    const analysisPanel = document.getElementById("analysis-panel");
    afpLayers.forEach((layer) => {
      let layerCard = document.createElement("calcite-card");
      layerCard.style.margin = "8px";

      let cardLoader = document.createElement("calcite-loader");
      cardLoader.id = `${layer.title}-loader`;
      cardLoader.style.display = "none";
      cardLoader.setAttribute("inline", "");
      cardLoader.setAttribute("slot", "footer-end");

      layerCard.append(cardLoader);

      let layerLabel = document.createElement("calcite-label");
      layerLabel.setAttribute("slot", "title");
      layerLabel.innerHTML = layer.title;

      layerCard.append(layerLabel);

      let layerCardStatLabel = document.createElement("calcite-label");
      layerCardStatLabel.setAttribute("layout", "center");

      let layerCardStatisticDiv = document.createElement("div");
      let layerCardStatisticSpan = document.createElement("span");
      layerCardStatisticSpan.id = `${layer.title}-statistic`;
      layerCardStatisticSpan.className = "stat-label";
      layerCardStatisticSpan.innerHTML = "0";

      layerCardStatisticDiv.append(layerCardStatisticSpan);

      let layerCardStatisticUnitSpan = document.createElement("span");
      layerCardStatisticUnitSpan.className = "unit-label";
      layerCardStatisticUnitSpan.innerHTML = " sq km";
      layerCardStatisticDiv.append(layerCardStatisticUnitSpan);

      layerCardStatLabel.append(layerCardStatisticDiv);

      let layerCardStatisticFooterDiv = document.createElement("div");
      layerCardStatisticFooterDiv.setAttribute("slot", "footer-start");
      layerCardStatisticFooterDiv.style.display = "flex";
      layerCardStatisticFooterDiv.style.flexDirection = "column";

      let layerCardStatisticFooterIntersectingSpan =
        document.createElement("span");
      layerCardStatisticFooterIntersectingSpan.id = `${layer.title}-footer-intersecting`;
      layerCardStatisticFooterIntersectingSpan.innerHTML =
        "Intersecting features: 0";

      layerCardStatisticFooterDiv.append(
        layerCardStatisticFooterIntersectingSpan
      );
      let layerCardStatisticFooterServiceTypeSpan =
        document.createElement("div");
      layerCardStatisticFooterServiceTypeSpan.style.display = "flex";
      layerCardStatisticFooterServiceTypeSpan.style.alignItems = "center";
      layerCardStatisticFooterServiceTypeSpan.style.fontSize = "0.85rem";
      layerCardStatisticFooterServiceTypeSpan.innerHTML =
        layer.type === "feature"
          ? `Feature Service (${layer.geometryType})`
          : "Service Layer";

      let iconElement = document.createElement("calcite-icon");
      iconElement.setAttribute(
        "icon",
        layer.geometryType === "polygon" ? "layer-polygon" : "layer-service"
      );
      iconElement.style.marginRight = "4px";

      layerCardStatisticFooterServiceTypeSpan.prepend(iconElement);

      layerCardStatisticFooterDiv.append(
        layerCardStatisticFooterServiceTypeSpan
      );

      layerCard.append(layerCardStatisticFooterDiv);

      layerCard.append(layerCardStatLabel);

      analysisPanel.append(layerCard);
    });
  }

  /**
   *
   * @param view
   */
  initializeAFPLayerIntersectAnalysis({ view }) {
    require([
      "esri/core/reactiveUtils",
      "esri/core/promiseUtils",
      "esri/geometry/geometryEngineAsync",
      "esri/geometry/support/geodesicUtils",
      "esri/geometry/support/webMercatorUtils",
    ], (
      reactiveUtils,
      promiseUtils,
      geometryEngineAsync,
      geodesicUtils,
      webMercatorUtils
    ) => {
      const afpLayers = view.map.layers.items.filter(
        (layer) => layer.title.indexOf("AFP") > -1
      );

      this.udpateUIforIntersectLayers(afpLayers);

      let abortController = new AbortController();

      const countFormatter = new Intl.NumberFormat("default", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });

      // SKETCH CHANGES //
      this.addEventListener(
        "sketch-ready",
        async ({ detail: { analysisArea } }) => {
          abortController.abort();
          abortController = new AbortController();

          if (analysisArea) {
            console.log("analysisArea", analysisArea);

            for (var i = 0; i < afpLayers.length; i++) {
              let cardLoader = document.getElementById(
                `${afpLayers[i].title}-loader`
              );
              cardLoader.style.display = "block";

              const layer = afpLayers[i];

              const lv = view.layerViews.find(
                (v) => v.layer.title === layer.title
              );

              const query = lv.createQuery();
              query.geometry = analysisArea;
              query.outFields = [layer.objectIdField];
              // query.outSpatialReference = { wkid: 4326 };

              const results = await lv.queryFeatures(query);

              let geoms = [];
              for (let i = 0; i < results.features.length; i++) {
                const feature = results.features[i];
                geoms.push(feature.geometry);
              }

              console.log(
                layer.title,
                `Intersecting features: ${geoms.length}`
              );

              if (geoms.length === 0) {
                cardLoader.style.display = "none";
                continue;
              }

              const intResult = await geometryEngineAsync.intersect(
                // geoms.filter((geom) => geom),
                geoms,
                analysisArea
                // geoms.map((g) => webMercatorUtils.webMercatorToGeographic(g)),
                // webMercatorUtils.webMercatorToGeographic(analysisArea)
              );

              cardLoader.style.display = "none";

              const layerCardStatisticFooterDiv = document.getElementById(
                `${layer.title}-footer-intersecting`
              );
              layerCardStatisticFooterDiv.innerHTML = `Intersecting features: ${intResult.length}`;

              const areas = geodesicUtils.geodesicAreas(
                intResult
                  .filter((g) => g)
                  .map((g) => webMercatorUtils.webMercatorToGeographic(g)),
                "square-kilometers"
              );

              const layerCardStatisticDiv = document.getElementById(
                `${layer.title}-statistic`
              );

              const totalArea = areas.reduce((acc, area) => acc + area, 0);
              layerCardStatisticDiv.innerHTML =
                countFormatter.format(totalArea);
            }
          } else {
            // CLEAR LABEL //
            popCountLabel.innerHTML = "";
          }
        }
      );
    });
  }
}

export default new Application();
