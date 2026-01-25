import { useState, useCallback } from 'react';

export function useColumnResize(initialWidths = {}) {
    const [columnWidths, setColumnWidths] = useState(initialWidths);

    const handleResize = useCallback((columnId, newWidth) => {
        setColumnWidths(prev => ({
            ...prev,
            [columnId]: Math.max(50, newWidth) // Minimum width of 50px
        }));
    }, []);

    const getColumnWidth = useCallback((columnId, defaultWidth = 'auto') => {
        return columnWidths[columnId] || defaultWidth;
    }, [columnWidths]);

    return { columnWidths, handleResize, getColumnWidth };
}
