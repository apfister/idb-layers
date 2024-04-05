# Population Count

Simple application to get population count for user defined area of interest from an Imagery Layer.

### Web Map
> WorldPop - population count\
> https://www.arcgis.com/home/item.html?id=64a648fbfb8442c8902effa114f7df5d

### Imagery Layer
> WorldPop Total Population 2000-2020 100m\
> https://www.arcgis.com/home/item.html?id=8c2db10c952e45b68efdfc78f64267b0


### JavaScript Libraries

This application is built with:
- [ArcGIS API for Javascript](https://developers.arcgis.com/javascript/latest/api-reference/)
- [Calcite Components](https://developers.arcgis.com/calcite-design-system/components/)

### Deploy

This demo is built as a _**static**_ web application.

1. Download and copy the root folder to a web accessible location
2. Update configuration parameters in application.json

### Configure

Update the parameters in ./config/application.json file in your favorite json editor:

|      parameter | details                                                           |
|---------------:|-------------------------------------------------------------------|
|  **portalUrl** | Organization or Enterprise URL; example: https://www.arcgis.com   |
| **oauthappid** | The OAuth ID of the Web Application item                          |
|   **authMode** | For public access set to 'anonymous' (and set oauthappid to null) |
|     **apiKey** | ArcGIS Platform API key                                           |
|     **webmap** | The item id of the web map                                        |
|   **webscene** | The item id of the web scene                                      |
|  **viewProps** | Additional view properties.                                       | 
|  **shareable** | List of shareable properties                                      |

#### For questions about the demo web application:

> John Grayson | Prototype Specialist | Geo Experience Center\
> Esri | 380 New York St | Redlands, CA 92373 | USA\
> T 909 793 2853 x1609 | [jgrayson@esri.com](mailto:jgrayson@esri.com) | [GeoXC Demos](https://geoxc.esri.com) | [esri.com](https://www.esri.com)
