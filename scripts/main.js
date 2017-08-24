'use strict';

import API from './api';

// Todo: current namespace implementation is kind of weird? We need to have backwards compatability so i havent changed it now, but we should.
const settings = window.gdApi.q[0][0];
const gdApi = new API(settings);

// Replace/Create our namespace(s).
window.gdApi = gdApi;
