import { scaleLinear } from 'd3-scale';

function _base64ToArrayBuffer(base64) {
    const binary_string = atob(base64);
    const len = binary_string.length;

    const bytes = new Uint8Array(len);

    for (let i = 0; i < len; i++) {
          bytes[i] = binary_string.charCodeAt(i);
        }

    return bytes.buffer;
}

const MinMaxLineTrack = (HGC, ...args) => {
  if (!new.target) {
    throw new Error(
      'Uncaught TypeError: Class constructor cannot be invoked without "new"',
    );
  }

  class MinMaxLineTrackClass extends HGC.tracks.HorizontalLine1DPixiTrack {
    constructor(
      scene, trackConfig, dataConfig, handleTilesetInfoReceived, animate,
    ) {
      super(
        scene,
        dataConfig,
        handleTilesetInfoReceived,
        trackConfig.options,
        animate,
      );
    }

    initTile(tile) {

      const minsArrayBuffer = _base64ToArrayBuffer(tile.tileData.mins);
      const maxsArrayBuffer = _base64ToArrayBuffer(tile.tileData.maxs);

      tile.tileData.mins = new Float32Array(minsArrayBuffer);
      tile.tileData.maxs = new Float32Array(maxsArrayBuffer);

      const minValue = Math.min.apply(null, tile.tileData.mins);
      const maxValue = Math.max.apply(null, tile.tileData.maxs);


      console.log('initTile');

      super.initTile(tile);

      this.scale.minValue = Math.min(minValue, this.scale.minRawValue);
      this.scale.maxValue = Math.max(maxValue, this.scale.maxRawValue);

      console.log('minRawValue:', this.scale.minRawValue);
    }

    drawTile(tile) {
      super.drawTile(tile);
      console.log('drawTile', tile);

      if (!tile.graphics) { return; }

      if (!tile.tileData || !tile.tileData.dense) {
        return;
      }

      const graphics = tile.graphics;

      const { tileX, tileWidth } = this.getTilePosAndDimensions(
        tile.tileData.zoomLevel,
        tile.tileData.tilePos,
      );

      const tileValues = tile.tileData.dense;

      if (tileValues.length === 0) { return; }

      // FIXME
      const [vs, offsetValue] = this.makeValueScale(
        this.minValue(),
        this.medianVisibleValue,
        this.maxValue()
      );
      this.valueScale = vs;

      graphics.clear();

      if (this.options.valueScaling === 'log' && this.valueScale.domain()[1] < 0) {
        console.warn('Negative values present when using a log scale', this.valueScale.domain());
        return;
      }

      // this scale should go from an index in the data array to
      // a position in the genome coordinates
      const tileXScale = scaleLinear().domain([0, this.tilesetInfo.tile_size])
        .range([tileX, tileX + tileWidth]);

      this.drawLine(tile, graphics, tile.tileData.maxs, 
        tileXScale, offsetValue, 0x00ff00, 0.5);
      this.drawLine(tile, graphics, tile.tileData.mins, 
        tileXScale, offsetValue, 0xff0000, 0.5);
      this.drawLine(tile, graphics, tileValues, tileXScale, offsetValue, 0x0000ff, 1);
    }

    drawLine(tile, graphics, tileValues, tileXScale, offsetValue, stroke, alpha) {
      /*
      const stroke = colorToHex(this.options.lineStrokeColor 
        ? this.options.lineStrokeColor : 'blue');
        */
      const strokeWidth = this.options.lineStrokeWidth ? this.options.lineStrokeWidth : 1;
      graphics.lineStyle(strokeWidth, stroke, alpha);

      const logScaling = this.options.valueScaling === 'log';

      for (let i = 0; i < tileValues.length; i++) {
        const xPos = this._xScale(tileXScale(i));
        const yPos = this.valueScale(tileValues[i] + offsetValue);

        tile.lineXValues[i] = xPos;
        tile.lineYValues[i] = yPos;

        if (i === 0) {
          graphics.moveTo(xPos, yPos);
          continue;
        }

        if (tileXScale(i) > this.tilesetInfo.max_pos[0]) {
          // this data is in the last tile and extends beyond the length
          // of the coordinate system
          break;
        }

        // if we're using log scaling and there's a 0 value, we shouldn't draw it
        // because it's invalid
        if (logScaling && tileValues[i] === 0) {
          graphics.moveTo(xPos, yPos);
        } else {
          graphics.lineTo(xPos, yPos);
        }
      }
    }

  }

  return new MinMaxLineTrackClass(...args);
};

const icon = '<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="1.5"><path d="M4 2.1L.5 3.5v12l5-2 5 2 5-2v-12l-5 2-3.17-1.268" fill="none" stroke="currentColor"/><path d="M10.5 3.5v12" fill="none" stroke="currentColor" stroke-opacity=".33" stroke-dasharray="1,2,0,0"/><path d="M5.5 13.5V6" fill="none" stroke="currentColor" stroke-opacity=".33" stroke-width=".9969299999999999" stroke-dasharray="1.71,3.43,0,0"/><path d="M9.03 5l.053.003.054.006.054.008.054.012.052.015.052.017.05.02.05.024 4 2 .048.026.048.03.046.03.044.034.042.037.04.04.037.04.036.042.032.045.03.047.028.048.025.05.022.05.02.053.016.053.014.055.01.055.007.055.005.055v.056l-.002.056-.005.055-.008.055-.01.055-.015.054-.017.054-.02.052-.023.05-.026.05-.028.048-.03.046-.035.044-.035.043-.038.04-4 4-.04.037-.04.036-.044.032-.045.03-.046.03-.048.024-.05.023-.05.02-.052.016-.052.015-.053.012-.054.01-.054.005-.055.003H8.97l-.053-.003-.054-.006-.054-.008-.054-.012-.052-.015-.052-.017-.05-.02-.05-.024-4-2-.048-.026-.048-.03-.046-.03-.044-.034-.042-.037-.04-.04-.037-.04-.036-.042-.032-.045-.03-.047-.028-.048-.025-.05-.022-.05-.02-.053-.016-.053-.014-.055-.01-.055-.007-.055L4 10.05v-.056l.002-.056.005-.055.008-.055.01-.055.015-.054.017-.054.02-.052.023-.05.026-.05.028-.048.03-.046.035-.044.035-.043.038-.04 4-4 .04-.037.04-.036.044-.032.045-.03.046-.03.048-.024.05-.023.05-.02.052-.016.052-.015.053-.012.054-.01.054-.005L8.976 5h.054zM5 10l4 2 4-4-4-2-4 4z" fill="currentColor"/><path d="M7.124 0C7.884 0 8.5.616 8.5 1.376v3.748c0 .76-.616 1.376-1.376 1.376H3.876c-.76 0-1.376-.616-1.376-1.376V1.376C2.5.616 3.116 0 3.876 0h3.248zm.56 5.295L5.965 1H5.05L3.375 5.295h.92l.354-.976h1.716l.375.975h.945zm-1.596-1.7l-.592-1.593-.58 1.594h1.172z" fill="currentColor"/></svg>';

MinMaxLineTrack.config = {
  type: 'min-max-line-track',
  datatype: ['scatter-point'],
  orientation: '2d',
  name: 'MinMaxLineTrack',
  thumbnail: new DOMParser().parseFromString(icon, 'text/xml').documentElement,
  availableOptions: [
  ],
  defaultOptions: {
  },
};

export default MinMaxLineTrack;
