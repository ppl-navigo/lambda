import React, { useEffect } from 'react';

useEffect(() => {
    throw new Error("Test client-side error");
}, []);
