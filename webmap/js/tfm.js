import 'ol/ol.css'
import {Map, View} from 'ol'
import TileLayer from 'ol/layer/Tile' // per importar TileLayer
import XYZ from 'ol/source/XYZ.js';// per importar capes XYZ
import OSM from 'ol/source/OSM' // per importar capes de osm
//import TileWMS from 'ol/source/TileWMS.js' //per importar capes wms
//per poder modificar els controls del mapa, importem els de per defecte més els que volem ficar nous
import {defaults as defaultControls, OverviewMap, FullScreen, MousePosition, ScaleLine} from 'ol/control.js'
import {createStringXY} from 'ol/coordinate' //per poder modificar les coordenades del MousePosition
//pel layerSwitcher
import LayerSwitcher from 'ol-layerswitcher/src/ol-layerswitcher.js'
import {Group as LayerGroup} from 'ol/layer.js'
//per vectors
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
//per importar capes Image
import ImageLayer from 'ol/layer/Image'; // per importar capes de tipus Image
import ImageWMS from 'ol/source/ImageWMS'; // per importar capes ImageWMS
//per importar de OpenStreetMap
import OSMXML from 'ol/format/OSMXML';
import {bbox as bboxStrategy} from 'ol/loadingstrategy.js';
import {transformExtent} from 'ol/proj.js'; //transforma coordenades
//per modificar els estils
import Style from 'ol/style/Style.js';
import Fill from 'ol/style/Fill.js';
import Stroke from 'ol/style/Stroke.js';
//per ficar icones
import Icon from 'ol/style/Icon.js';
import restaurant_icon from 'd:/Mapes/OpenLayers/TFM/images/restaurant_icon.png';

//per fer els overlays
import Overlay from 'ol/Overlay.js'
//imports per fer estils interactius
import {click, pointerMove} from 'ol/events/condition.js';
import Select from 'ol/interaction/Select.js';
import {defaults as defaultInteractions} from 'ol/interaction.js';
import CircleStyle from 'ol/style/Circle.js'//per poder crear cercles
//capes json
import GeoJSON from 'ol/format/GeoJSON.js' // per capes geojson


//CAPES BASE
//Capa base tipus mapa
var osm= new TileLayer({
  title: 'Mapa',//nom que sortirà al layerSwitcher
  type: 'base', //tipus de capa (base o overlay)
  visible: true, //si es visible quan s'inici el mapa
  source: new OSM({
    attributions: '&copy; <a href="https://www.openstreetmap.org/copyright">'//fiquem les atribucions
    +'OpenStreetMap</a> contributors'
  })
});
//Capa base satel·lit
//Ho fem igual que la capa anterior
var arcgis = new TileLayer({
  title: 'Satel·lit', //títol de la mevacapa
  type: 'base',//Tipus de mevacapa
  visible: false,
  source: new XYZ({
    url:'https://server.arcgisonline.com/ArcGIS/rest/services/'
      +'World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attributions: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye,'
      +' Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
  })
})

//CAPES OVERLAYS
//CAPA IMPORTADA GEOSERVER
var fotos = new ImageLayer({
  title: 'Heatmap', //nom que surtirà al layerSwitcher
  type: 'Overlays', //tipus de capa, ens serveis pel LayerSwitcher
  opacity:0.8, //el nivell de transparència
  visible: false,//perquè no es mostri al iniciar el mapa
  source: new ImageWMS({ //li diem que és una capa ImageWMS
    url:'http://localhost:8085/geoserver/tfm/wms?', //url de la capa wms
    params:{ //definim la capa wms
      'LAYERS': 'tfm', //capa que volem que agafi (del wms k li hem dit)
      'FORMAT': 'image/png' //format de la imatge
    },
    serverType: 'geoserver',
  })
})


//CAPA IMPORTADA OSM
//Importem de OSM els restaurants
//OSMXML
//Instanciem un objecte amb format de OSMXML buit per utilitzar posteriorment
var osmxmlFormat = new OSMXML();

//Creem la font de les dades
var vectorSource = new VectorSource({
  loader: function(extent, resolution, projection) { //el loader defineix una funció
    //reprojectem la variable extent a coordenadas geogràfiques (EPSG:4326), ja que està en EPSG:3857
    var epsg4326Extent = transformExtent(extent, projection, 'EPSG:4326');
    //Creem una variable que ens dongui dins d'un "bounding box" totes les entitats de tipus 'way'
    //que siuin 'highway'.
    //amb el 'join' el que fa és tornar-nos les dades a la variable 'epsg4326Extent' com una cadena
    //de caracters separats per (',')
    var url = 'http://www.overpass-api.de/api/xapi?node[amenity=restaurant]'
      +'[bbox=1.0916,41.1177,1.1397,41.1778'// li diem les dimencions de la zona
      + epsg4326Extent.join(',')+']';//a on s'ha de baixar les dades
    //fem servir la teconolgia AJAX de la API JQuery per demanar les dades a OSM
    //a partir de la variable 'url' que hem escrit més amunt
    $.ajax(url).then(function(response) { //el 'response' son les dades que ha agafat del servirdor de OSM
    //el readFeatures reprojecta les dades rebudes ('response') de EPSG:4326 a EPSG:3857
      var features = osmxmlFormat.readFeatures(response,{dataProjection:'EPSG:4326',//projecció de les dades rebudes
        featureProjection:'EPSG:3857'});//projecció desitjada
          vectorSource.addFeatures(features);
      });
  },
  //definim l'estrategia que fara servir l'objecte VectorSource per solicitar les dades al OSM
  strategy: bboxStrategy
});

//Creem la capa amb la font de dades anterior
var restaurants = new VectorLayer({
  title: 'Restaurants', //Títol de la capa
  type: 'Overlays',//Típus de capa
  visible: true,//perquè no es mostri al iniciar el mapa
  source: vectorSource,
  style: new Style({ //perquè canviar l'icona que volem que mostri
    image: new Icon({
      src: restaurant_icon, //el fitxer amb l'imatge
      size:[48,48],//mida de la icona
      anchor: [24,43], //per ajustar el punt a on surt la icona
      anchorXUnits: 'pixels',
      anchorYUnits: 'pixels'
    })
  })
})


//PER ACTIVAR POPUP
//Definim la interacció
var selectInteraction = new Select({
  condition: click, //que quan facis clic amb el botó s'activi
  //condition: pointerMove, //que quan passis amb el ratolí s'activi
  layers: [restaurants], //Capes en que es farà la interacció
  style: new Style({ //estil que tindrà el punt quan el seleccionem
    image: new CircleStyle({
      radius: 10, //mida del cercle
      fill: new Fill({ //color de dins
        color: 'rgba(128,128,128,1)'
      }),
      stroke: new Stroke({ //color del voltant
        color: 'rgba(255, 255, 0,1)',
        width: 3//amplada
      })
    })
  }) //Si volguessim ficar un estil al clicar
})
//Perquè quan seleccioni un element de la capa s'activi el popup
selectInteraction.on('select', function(evento) {
  var coordinate = evento.mapBrowserEvent.coordinate;
  var isSelected = evento.selected.length //Si l'array està buit (length=0) vol di que no hi ha entitats seleccionades
  if (isSelected) { //Si s'ha seleccionat una entitat
    var feature = evento.selected[0];
    var content = document.getElementById('popup');
    var info='Nom: <b>'+feature.get('name') //només ens ha de dir el valor de la variable name
    popup.setPosition(coordinate);//Inserim les coordenades al objecte popup
    content.innerHTML = info;//inserim la informació
  }
  else { //Si no s'ha seleccionat una entidat
    popup.setPosition(undefined); //Inserim unes cooredandes indefinides pq no apareixi al mapa
  }
});


//LAYERSWITCHER
//Creem la variable mylayers amb totes les capes agrupades. Les agrupem en dos grups.
//Una de capes base i una altre grup de sobreposades (overlays)
 var mylayers = [
   //Capes base
   new LayerGroup({
     'title': 'Base maps',//nom del grup de capes
     layers: [osm, arcgis]
   }),
   //Capa Overlays
   new LayerGroup({
     title: 'Overlays',
     layers: [fotos, restaurants]
   })
 ]

//CONTROLS MAPA
//MINIMAPA
//Definim les opcions del minimapa de localització (overviewmap)
var overviewoptions = {
  className: 'ol-overviewmap ol-custom-overviewmap', //Nom de la classe, pq així a l'axiu css definim un estil per aquesta classe. En posem dos, el de per defecte i el que definim a l'arxiu css
  layers:[ //les capes que mostrarà el minimapa
  new TileLayer({ //en aquest cas farem servir la mateixa del mapa, però pot ser diferent
    source: new OSM({
      'url': 'http://{a-c}.tile.opencyclemap.org/cycle/{z}/{x}/{y}.png'
    })
  })
],
collapsed: true,//li diem que per defecte el mapa no estigui minimitzat
tipLabel: 'Mapa de localització'//és el text k sortirà quan hi passis pel damunt amb el ratolí
}

//FULLSCREEN (pantalla completa)
var fullscrrenoptions ={
  tipLabel:'Mostra el mapa a pantalla completa' //text que mostra quan el ratolí hi passa pel damunt
}

//MOUSEPOSITION
//Configurem les opcions perquè quan passem el ratolí per la pantalla ens surtin les coordenades
var mousepositionoptions= {
  coordinateFormat: createStringXY(2),
  className: 'opcionsRatoli',
  target: document.getElementById('ratoli'), //el lloc del codi html a on ha d'anar
  undefinedHTML: '&nbsp;'
}

//ESCALA lINE
var scalaLineOptions = {
    className: 'ol-scale-line',
  units: 'metric'
}

//ELEMENT POPUP
//Creem l'element Overlay
var popup = new Overlay({
  element: document.getElementById('popup')//li diem a on ha quin lloc del codi
}); //html ha d'anar



//MAPA
//Definim la variable map que és la que tindrà el mapa de l'aplicació
var map = new Map({
  target: 'map', //és l'element del codi html a on anirà el mapa (el div que li hem posat la id "map")
  layers: mylayers, //són les capes del mapa
  view: new View({ //defineix la vista inicial.
    center: [123210.8, 5035381.9],//Coordenades inicials del centre del mapa. EPSG: 3857
    zoom: 14, //Zoom inicial
    maxZoom: 18, //zoom mii
    minZoom: 13,
    extent: [117142, 5028925, 133800, 5041602], //ens permet limitar fins a on pots moure el mapa.
  }),
  controls: defaultControls().extend([//Afegeirem més elements als "Controls", a part dels de per defecte(zoom, atribution, rotation)
    new OverviewMap(overviewoptions),//Afefeix el minimapa (overviewmap) definit amb la variable k creat (overviewoptions)
    new FullScreen(fullscrrenoptions),//pel fullscrren
    new MousePosition(mousepositionoptions), // perquè et digui les coordenades
    new ScaleLine(scalaLineOptions)//per veure l'escala gràfica
  ]),
  interactions: defaultInteractions().extend([selectInteraction]),//és pq l'usuari pugui seleccionar
  overlays: [popup]
})

//CONTROL PER CANVIAR LES CAPES
//Definim el control
var layerSwitcher = new LayerSwitcher({ //
  tipLabel: 'Selector de capes'//nom que surtirà quan passem el ratolí pel damunt
})
//Agraguem el control al mapa
map.addControl(layerSwitcher)
//Li diem que quan inici el mapa estigui desplegat
layerSwitcher.showPanel()
