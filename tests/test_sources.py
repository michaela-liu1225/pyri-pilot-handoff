"""Release contracts: source diversity, usable samples and explicit imperfections."""
import hashlib
import unittest
from collections import Counter
from app import DATA, UPPER_FEEDS, read_json


class SourceContracts(unittest.TestCase):
    def test_satellite_samples_and_provenance(self):
        for feed, value, resolution in [('satellite_optical', 'ndvi', 'native_reflectance_resolution_m'),
                                         ('satellite_thermal', 'surface_temperature_c', 'native_thermal_resolution_m')]:
            rows = UPPER_FEEDS[feed]
            self.assertEqual(len(rows), 2560)
            self.assertEqual(len({r['scene_id'] for r in rows}), 2)
            self.assertTrue(any(r[value] == '' for r in rows))
            self.assertTrue(any(r[value] != '' for r in rows))
            self.assertTrue(all(float(r[resolution]) > 0 for r in rows))
        provenance = read_json('multisource/provenance.json')
        for name, expected in provenance['file_sha256'].items():
            self.assertEqual(hashlib.sha256((DATA/'multisource'/name).read_bytes()).hexdigest(), expected)
        optical = UPPER_FEEDS['satellite_optical']
        self.assertTrue(any('2021-08-30T18:00:00Z' < r['available_at'] <= '2021-08-31T00:00:00Z' for r in optical))

    def test_synthetic_sensors_expose_quality_and_delivery_problems(self):
        rows = UPPER_FEEDS['sensors']
        self.assertEqual(len({r['sensor_id'] for r in rows}), 3)
        self.assertTrue(all(r['source_kind'] == 'synthetic' for r in rows))
        self.assertTrue(any(r['quality'] == 'suspect' for r in rows))
        self.assertTrue(any(n > 1 for n in Counter(r['packet_id'] for r in rows).values()))
        self.assertTrue(any(r['available_at'] > '2021-08-31T00:00:00Z' for r in rows))
        self.assertTrue(all(r['source_kind'] == 'synthetic_product_like' for r in UPPER_FEEDS['thermal_detections']))
