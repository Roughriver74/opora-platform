import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import Map from 'ol/Map';
import View from 'ol/View';
import { fromLonLat } from 'ol/proj';
import OSM from 'ol/source/OSM';
import Feature, { FeatureLike } from 'ol/Feature';
import Point from 'ol/geom/Point';
import Style, { StyleFunction } from 'ol/style/Style';
import Icon from 'ol/style/Icon';
import VectorSource from 'ol/source/Vector';
import TileLayer from 'ol/layer/Tile';
import VectorImageLayer from 'ol/layer/VectorImage';
import Select from 'ol/interaction/Select';
import Overlay from 'ol/Overlay';
import clinicIcons from '../assets/clinicIcons.svg';
import { click } from 'ol/events/condition';

interface Clinic {
    id: number;
    name: string;
    address: string;
    clinic_coordinates: {
        latitude: number;
        longitude: number;
    }

}

interface OLMapModalProps {
    open: boolean;
    onClose: () => void;
    clinics: Clinic[];
}

const OLMapModal: React.FC<OLMapModalProps> = ({ open, onClose, clinics }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<Map | null>(null);

    const handleUpdateMapSize = () => {
        if (map) {
            map.updateSize();
        }
    };

    useEffect(() => {
        if (!open) return;

        const interval = setInterval(() => {
            if (mapRef.current) {
                clearInterval(interval);
                initMap();
            }
        }, 50);
        const initMap = () => {
            const vectorSource = new VectorSource();
            clinics.forEach((clinic) => {
                const feature = new Feature({
                    geometry: new Point(fromLonLat([clinic.clinic_coordinates.longitude, clinic.clinic_coordinates.latitude])),
                    name: clinic.name,
                    address: clinic.address,
                    coordinates: [clinic.clinic_coordinates.longitude, clinic.clinic_coordinates.latitude],
                });
                vectorSource.addFeature(feature);
            });

            const defaultStyle = new Style({
                image: new Icon({
                    src: clinicIcons,
                }),
            });

            const selectedStyle = new Style({
                image: new Icon({
                    src: clinicIcons,

                }),
            });

            const styleFunction = (feature: FeatureLike, resolution: number): Style | Style[] | null => {
                if ('get' in feature && typeof feature.get === 'function') {
                    const isSelected = feature.get('selected') || false;
                    return isSelected ? selectedStyle : defaultStyle;
                }
                return defaultStyle; // fallback
            };

            const vectorLayer = new VectorImageLayer({
                source: vectorSource,
                style: styleFunction as StyleFunction,
            });

            const olMap = new Map({
                target: mapRef.current!,
                layers: [
                    new TileLayer({
                        source: new OSM({
                            attributions: undefined,
                        }),
                    }),
                    vectorLayer,
                ],
                view: new View({
                    center: fromLonLat([37.62, 55.75]),
                    zoom: 10,
                }),
                controls: [],
            });

            const popupElement = document.createElement('div');
            popupElement.className = 'ol-popup';
            const popup = new Overlay({
                element: popupElement,
                positioning: 'bottom-center',
                stopEvent: true,
                autoPan: true,
            });
            olMap.addOverlay(popup);

            const tooltipElement = document.createElement('div');
            tooltipElement.className = 'ol-tooltip';
            tooltipElement.style.cssText = `
                position: absolute;
                background: rgba(0, 0, 0, 0.7);
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                white-space: nowrap;
                pointer-events: none;
                z-index: 1000;
            `;
            const tooltip = new Overlay({
                element: tooltipElement,
                positioning: 'top-center',
                offset: [0, -10],
                stopEvent: false,
            });
            olMap.addOverlay(tooltip);

            const selectInteraction = new Select({ condition: (e) => click(e) });
            olMap.addInteraction(selectInteraction);

            selectInteraction.on('select', (e) => {
                // Сброс выделения
                vectorSource.getFeatures().forEach((f) => f.set('selected', false));
                const selected = e.selected[0];
                if (selected) {
                    selected.set('selected', true);
                    const geom = selected.getGeometry() as Point;
                    const coord = geom.getCoordinates();
                    const props = selected.getProperties();

                    popup.setPosition(coord);
                    popupElement.innerHTML = `
                        <strong>${props.name}</strong><br>
                        ${props.address}<br>
                        <small>(${props.coordinates[0].toFixed(6)}, ${props.coordinates[1].toFixed(6)})</small>
                    `;
                    popupElement.style.display = 'block';
                } else {
                    popupElement.style.display = 'none';
                }

                // Обновление стилей
                vectorLayer.changed();
            });

            olMap.on('pointermove', (e) => {
                const pixel = olMap.getEventPixel(e.originalEvent);
                const feature = olMap.forEachFeatureAtPixel(pixel, (feat) => feat);

                if (feature) {
                    const props = feature.getProperties();
                    tooltipElement.innerHTML = `${props.name}<br><small>${props.coordinates[0].toFixed(5)}, ${props.coordinates[1].toFixed(5)}</small>`;
                    tooltip.setPosition((feature.getGeometry() as Point).getCoordinates());
                    tooltipElement.style.display = 'block';
                } else {
                    tooltipElement.style.display = 'none';
                }
            });

            olMap.on('click', () => {
                tooltipElement.style.display = 'none';
            });


            setMap(olMap);

            setTimeout(() => {
                olMap.updateSize();
            }, 100);

            return () => {
                olMap.setTarget(undefined);
                setMap(null);
            };
        };

        return () => {
            clearInterval(interval);
            if (map) {
                map.setTarget(undefined);
            }
            setMap(null);
        };
    }, [clinics, open]);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="lg"
            TransitionProps={{
                onEntered: handleUpdateMapSize,
            }}
        >
            <DialogTitle>Карта клиник</DialogTitle>
            <DialogContent style={{ height: '600px', padding: 0 }}>
                <div ref={mapRef} className="map" style={{ width: '100%', height: '100%' }} />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Закрыть</Button>
            </DialogActions>
        </Dialog>
    );
};

export default OLMapModal;