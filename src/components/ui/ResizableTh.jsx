import React, { useState, useCallback, useEffect } from 'react';

export default function ResizableTh({ children, width, onResize, className = '', minWidth = 50, ...props }) {
    const [isResizing, setIsResizing] = useState(false);

    const startResize = useCallback((e) => {
        e.preventDefault();
        setIsResizing(true);

        const startX = e.pageX;
        const startWidth = width || e.target.parentElement.offsetWidth;

        const onMouseMove = (moveEvent) => {
            const currentX = moveEvent.pageX;
            const diffX = currentX - startX;
            const newWidth = Math.max(minWidth, startWidth + diffX);
            onResize(newWidth);
        };

        const onMouseUp = () => {
            setIsResizing(false);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.body.style.cursor = 'default';
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        document.body.style.cursor = 'col-resize';
    }, [width, onResize, minWidth]);

    return (
        <th
            className={`relative group ${className}`}
            style={{ width: width, position: 'relative' }}
            {...props}
        >
            <div className="flex items-center h-full w-full">
                {children}
            </div>
            <div
                onMouseDown={startResize}
                className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 z-10 select-none transition-colors ${isResizing ? 'bg-blue-600' : 'bg-transparent'}`}
                style={{ touchAction: 'none' }}
            />
        </th>
    );
}
