import * as React from "react";

import { ColumnSelection, GridCell, GridCellKind, GridColumn, isEditableGridCell } from "../data-grid/data-grid-types";
import DataEditor, { DataEditorProps } from "./data-editor";
import DataEditorContainer from "../data-editor-container/data-grid-container";

import faker from "faker";
import styled from "styled-components";
import AutoSizer from "react-virtualized-auto-sizer";
import { SimpleThemeWrapper } from "../stories/story-utils";
import { browserIsOSX } from "../common/browser-detect";

faker.seed(1337);

export default {
    title: "DataEditor",

    decorators: [
        (Story: React.ComponentType) => (
            <SimpleThemeWrapper>
                <Story />
            </SimpleThemeWrapper>
        ),
    ],
};

interface GridColumnWithMockingInfo extends GridColumn {
    getContent(): GridCell;
}

function getGridColumn(columnWithMock: GridColumnWithMockingInfo): GridColumn {
    const { getContent, ...rest } = columnWithMock;

    return rest;
}

const BeautifulStyle = styled.div`
    background-color: #2790b9;
    background: linear-gradient(90deg, #2790b9, #2070a9);
    color: white;

    padding: 32px 48px;

    display: flex;
    flex-direction: column;
    height: 100vh;

    font-family: sans-serif;

    & > h1 {
        font-size: 50px;
        font-weight: 600;
        flex-shrink: 0;
        margin: 0 0 12px 0;
    }

    .sizer {
        flex-grow: 1;

        background-color: white;

        border-radius: 12px;
        box-shadow: rgba(9, 30, 66, 0.25) 0px 4px 8px -2px, rgba(9, 30, 66, 0.08) 0px 0px 0px 1px;

        .sizer-clip {
            border-radius: 12px;
            overflow: hidden;

            height: 100%;
        }
    }
`;

const PropName = styled.span`
    font-family: monospace;
    font-weight: 500;
    color: #ffe394;
`;

const Description = styled.p`
    font-size: 18px;
    flex-shrink: 0;
    margin: 0 0 20px 0;
`;

const MoreInfo = styled.p`
    font-size: 14px;
    flex-shrink: 0;
    margin: 0 0 20px 0;
`;

interface BeautifulProps {
    title: string;
    description?: React.ReactNode;
}

const BeautifulWrapper: React.FC<BeautifulProps> = p => {
    const { title, children, description } = p;
    return (
        <BeautifulStyle>
            <h1>{title}</h1>
            {description}
            <div className="sizer">
                <div className="sizer-clip">
                    <AutoSizer>
                        {(props: { width?: number; height?: number }) => (
                            <DataEditorContainer width={props.width ?? 100} height={props.height ?? 100}>
                                {children}
                            </DataEditorContainer>
                        )}
                    </AutoSizer>
                </div>
            </div>
        </BeautifulStyle>
    );
};

function createTextColumnInfo(index: number): GridColumnWithMockingInfo {
    return {
        title: `Column ${index}`,
        width: 120,
        icon: "headerImage",
        hasMenu: false,
        getContent: () => {
            const text = faker.lorem.word();

            return {
                kind: GridCellKind.Text,
                data: text,
                displayData: text,
                allowOverlay: true,
                readonly: true,
            };
        },
    };
}

// Returns a map from column titles to a their corresponding column data
function getResizableColumns(amount: number): GridColumnWithMockingInfo[] {
    const defaultColumns: GridColumnWithMockingInfo[] = [
        {
            title: "Avatar",
            width: 120,
            icon: "headerImage",
            hasMenu: false,
            getContent: () => {
                return {
                    kind: GridCellKind.Image,
                    data: [`${faker.image.people()}?random=${Math.round(Math.random() * 1000)}`],
                    allowOverlay: true,
                    allowAdd: false,
                    readonly: true,
                };
            },
        },
        {
            title: "First name",
            width: 120,
            icon: "headerString",
            hasMenu: false,
            getContent: () => {
                const firstName = faker.name.firstName();
                return {
                    kind: GridCellKind.Text,
                    displayData: firstName,
                    data: firstName,
                    allowOverlay: true,
                    readonly: true,
                };
            },
        },
        {
            title: "Last name",
            width: 120,
            icon: "headerString",
            hasMenu: false,
            getContent: () => {
                const lastName = faker.name.lastName();
                return {
                    kind: GridCellKind.Text,
                    displayData: lastName,
                    data: lastName,
                    allowOverlay: true,
                    readonly: true,
                };
            },
        },
        {
            title: "Email",
            width: 120,
            icon: "headerString",
            hasMenu: false,
            getContent: () => {
                const email = faker.internet.email();
                return {
                    kind: GridCellKind.Text,
                    displayData: email,
                    data: email,
                    allowOverlay: true,
                    readonly: true,
                };
            },
        },
        {
            title: "Company",
            width: 120,
            icon: "headerString",
            hasMenu: false,
            getContent: () => {
                const company = faker.company.companyName();
                return {
                    kind: GridCellKind.Text,
                    displayData: company,
                    data: company,
                    allowOverlay: true,
                    readonly: true,
                };
            },
        },
        {
            title: "More Info",
            width: 120,
            icon: "headerUri",
            hasMenu: false,
            getContent: () => {
                const url = faker.internet.url();
                const data = `My main link is [This](${url}).`;
                return {
                    kind: GridCellKind.Markdown,
                    displayData: url,
                    data: url,
                    allowOverlay: true,
                    readonly: true,
                };
            },
        },
    ];

    const extraColumnsAmount = amount - defaultColumns.length;

    const extraColumns = [...new Array(extraColumnsAmount)].map((_, index) =>
        createTextColumnInfo(index + defaultColumns.length)
    );

    return [...defaultColumns, ...extraColumns];
}

class ContentCache {
    // column -> row -> value
    private cachedContent: Map<number, Map<number, any>> = new Map();

    get(col: number, row: number) {
        const colCache = this.cachedContent.get(col);

        if (colCache === undefined) {
            return undefined;
        }

        return colCache.get(row);
    }

    set(col: number, row: number, value: any) {
        if (this.cachedContent.get(col) === undefined) {
            this.cachedContent.set(col, new Map());
        }

        const rowCache = this.cachedContent.get(col) as Map<number, any>;
        rowCache.set(row, value);
    }
}

function useMockDataGenerator(numCols: number, readonly: boolean = true) {
    const cache = React.useRef<ContentCache>(new ContentCache());

    const [colsMap, setColsMap] = React.useState(() => getResizableColumns(numCols));

    React.useEffect(() => {
        setColsMap(getResizableColumns(numCols));
    }, [numCols]);

    const onColumnResized = React.useCallback((column: GridColumn, newSize: number) => {
        setColsMap(prevColsMap => {
            const index = prevColsMap.findIndex(ci => ci.title === column.title);
            const newArray = [...prevColsMap];
            newArray.splice(index, 1, {
                ...prevColsMap[index],
                width: newSize,
            });
            return newArray;
        });
    }, []);

    const cols = React.useMemo(() => {
        return colsMap.map(getGridColumn);
    }, [colsMap]);

    const getCellContent = React.useCallback(
        ([col, row]: readonly [number, number]): GridCell => {
            let val = cache.current.get(col, row);
            if (val === undefined) {
                val = colsMap[col].getContent();
                cache.current.set(col, row, val);
            }

            if (!readonly) {
                val = { ...val, readonly };
            }
            return val;
        },
        [colsMap, readonly]
    );

    const setCellValue = React.useCallback(([col, row]: readonly [number, number], val: GridCell): void => {
        const current = cache.current.get(col, row);
        if (isEditableGridCell(val)) {
            cache.current.set(col, row, {
                ...current,
                data: val.data,
                displayData: val.data,
            });
        }
    }, []);

    return { cols, getCellContent, onColumnResized, setCellValue };
}

const defaultProps: Partial<DataEditorProps> = {
    smoothScrollX: true,
    smoothScrollY: true,
    isDraggable: false,
    showTrailingBlankRow: false,
    rowMarkers: false,
};

export const ResizableColumns: React.VFC = () => {
    const { cols, getCellContent, onColumnResized } = useMockDataGenerator(6);

    return (
        <BeautifulWrapper
            title="Resizable columns"
            description={
                <Description>
                    can resize columns by passing a <PropName>onColumnResized</PropName> prop
                </Description>
            }>
            <DataEditor
                {...defaultProps}
                getCellContent={getCellContent}
                columns={cols}
                rows={50}
                allowResize={true}
                onColumnResized={onColumnResized}
            />
        </BeautifulWrapper>
    );
};
(ResizableColumns as any).parameters = {
    options: {
        showPanel: false,
    },
};

export const SmallEditableGrid = () => {
    const { cols, getCellContent, setCellValue } = useMockDataGenerator(5, false);

    return (
        <BeautifulWrapper
            title="Editable Grid"
            description={
                <Description>
                    Data grid suDescriptionorts overlay editors for changing values. There are bespoke editors for
                    numbers, strings, images, booleans, markdown, and uri.
                </Description>
            }>
            <DataEditor
                {...defaultProps}
                getCellContent={getCellContent}
                columns={cols}
                rows={20}
                onCellEdited={setCellValue}
            />
        </BeautifulWrapper>
    );
};
(SmallEditableGrid as any).parameters = {
    options: {
        showPanel: false,
    },
};

export const OneMillionRows: React.VFC = () => {
    const { cols, getCellContent } = useMockDataGenerator(6);

    return (
        <BeautifulWrapper
            title="One Million Rows"
            description={<Description>Data grid supports over 1 million rows. Your limit is mostly RAM.</Description>}>
            <DataEditor {...defaultProps} getCellContent={getCellContent} columns={cols} rows={1_000_000} />
        </BeautifulWrapper>
    );
};
(OneMillionRows as any).parameters = {
    options: {
        showPanel: false,
    },
};

export const OneHundredThousandCols: React.VFC = () => {
    const { cols, getCellContent } = useMockDataGenerator(100000);

    return (
        <BeautifulWrapper
            title="One Hundred Thousand Columns"
            description={
                <Description>
                    Data grid supports way more columns than you will ever need. Also this is rendering 10 million cells
                    but that&apos;s not important.
                </Description>
            }>
            <DataEditor {...defaultProps} getCellContent={getCellContent} columns={cols} rows={1000} />
        </BeautifulWrapper>
    );
};
(OneHundredThousandCols as any).parameters = {
    options: {
        showPanel: false,
    },
};

export const TenMillionCells: React.VFC = () => {
    const { cols, getCellContent } = useMockDataGenerator(100);

    return (
        <BeautifulWrapper
            title="Ten Million Cells"
            description={<Description>Data grid supports over 10 million cells. Go nuts with it.</Description>}>
            <DataEditor {...defaultProps} getCellContent={getCellContent} columns={cols} rows={100_000} />
        </BeautifulWrapper>
    );
};
(TenMillionCells as any).parameters = {
    options: {
        showPanel: false,
    },
};

interface SmoothScrollingGridProps {
    smoothScrollX: boolean;
    smoothScrollY: boolean;
}

export const SmoothScrollingGrid: React.FC<SmoothScrollingGridProps> = p => {
    const { cols, getCellContent } = useMockDataGenerator(30);

    return (
        <BeautifulWrapper
            title="Smooth scrolling"
            description={
                <Description>
                    You can enable smooth scrolling with the <PropName>smoothScrollX</PropName> and{" "}
                    <PropName>smoothScrollY</PropName> props. Disabling smooth scrolling can dramatically increase
                    performance with and improve visual stability during rapid scrolling.
                </Description>
            }>
            <DataEditor
                {...defaultProps}
                smoothScrollX={p.smoothScrollX}
                smoothScrollY={p.smoothScrollY}
                getCellContent={getCellContent}
                columns={cols}
                rows={10_000}
            />
        </BeautifulWrapper>
    );
};
(SmoothScrollingGrid as any).args = {
    smoothScrollX: false,
    smoothScrollY: false,
};
(SmoothScrollingGrid as any).parameters = {
    options: {
        showPanel: true,
    },
};

interface AddColumnsProps {
    columnsCount: number;
}

export const AddColumns: React.FC<AddColumnsProps> = p => {
    const { cols, getCellContent } = useMockDataGenerator(p.columnsCount);

    return (
        <BeautifulWrapper
            title="Add and remove columns"
            description={<Description>You can add and remove columns at your disposal</Description>}>
            <DataEditor {...defaultProps} getCellContent={getCellContent} columns={cols} rows={10_000} />
        </BeautifulWrapper>
    );
};
(AddColumns as any).args = {
    columnsCount: 10,
};
(AddColumns as any).argTypes = {
    columnsCount: {
        control: {
            type: "range",
            min: 6,
            max: 200,
        },
    },
};
(AddColumns as any).parameters = {
    options: {
        showPanel: true,
    },
};

export const AutomaticRowMarkers: React.VFC = () => {
    const { cols, getCellContent } = useMockDataGenerator(6);

    const [selectedRows, setSelectedRows] = React.useState<readonly number[]>();

    return (
        <BeautifulWrapper
            title="Automatic Row Markers"
            description={
                <Description>
                    You can enable row markers with complex selection behavior using the <PropName>rowMarkers</PropName>{" "}
                    prop
                </Description>
            }>
            <DataEditor
                {...defaultProps}
                selectedRows={selectedRows}
                onSelectedRowsChange={setSelectedRows}
                rowMarkers={true}
                getCellContent={getCellContent}
                columns={cols}
                rows={1_000}
            />
        </BeautifulWrapper>
    );
};
(AutomaticRowMarkers as any).parameters = {
    options: {
        showPanel: false,
    },
};

export const DrawCustomCells: React.VFC = () => {
    const { cols, getCellContent } = useMockDataGenerator(6);

    return (
        <BeautifulWrapper
            title="Draw custom cells"
            description={
                <Description>
                    You can draw custom cell contents however you want using the <PropName>drawCustomCell</PropName>{" "}
                    prop
                </Description>
            }>
            <DataEditor
                {...defaultProps}
                getCellContent={getCellContent}
                columns={cols}
                drawCustomCell={(ctx, cell, _theme, rect) => {
                    if (cell.kind !== GridCellKind.Text) return false;

                    const hasX = cell.displayData.toLowerCase().includes("x"); // all my x's live in texas

                    ctx.save();
                    const { x, y, width, height } = rect;
                    const data = cell.displayData;

                    ctx.fillStyle = hasX ? "#bfffcd" : "#ffe6e6";
                    ctx.fillRect(x + 1, y + 1, width - 1, height - 1);

                    ctx.fillStyle = hasX ? "#0fc035" : "#e01e1e";
                    ctx.font = "bold 14px sans-serif";
                    ctx.fillText(data, x + 8 + 0.5, y + height / 2 + 4.5);
                    ctx.restore();

                    return true;
                }}
                rows={1_000}
            />
        </BeautifulWrapper>
    );
};
(DrawCustomCells as any).parameters = {
    options: {
        showPanel: false,
    },
};

export const RearrangeColumns: React.VFC = () => {
    const { cols, getCellContent } = useMockDataGenerator(6);

    // This is a dirty hack because the mock generator doesn't really support changing this. In a real data source
    // you should track indexes properly
    const [sortableCols, setSortableCols] = React.useState(cols);

    const onColMoved = React.useCallback((startIndex: number, endIndex: number): void => {
        setSortableCols(old => {
            const newCols = [...old];
            const [toMove] = newCols.splice(startIndex, 1);
            newCols.splice(endIndex, 0, toMove);
            return newCols;
        });
    }, []);

    const getCellContentMangled = React.useCallback(
        ([col, row]: readonly [number, number]): GridCell => {
            const remappedCol = cols.findIndex(c => c.title === sortableCols[col].title);
            return getCellContent([remappedCol, row]);
        },
        [cols, getCellContent, sortableCols]
    );

    return (
        <BeautifulWrapper
            title="Rearrange Columns"
            description={
                <Description>
                    Columns can be rearranged by responding to the <PropName>onColumnMoved</PropName> callback.
                </Description>
            }>
            <DataEditor
                {...defaultProps}
                getCellContent={getCellContentMangled}
                columns={sortableCols}
                onColumnMoved={onColMoved}
                rows={1_000}
            />
        </BeautifulWrapper>
    );
};
(RearrangeColumns as any).parameters = {
    options: {
        showPanel: false,
    },
};

interface RowAndHeaderSizesProps {
    rowHeight: number;
    headerHeight: number;
}
export const RowAndHeaderSizes: React.VFC<RowAndHeaderSizesProps> = p => {
    const { cols, getCellContent } = useMockDataGenerator(6);

    const [selectedRows, setSelectedRows] = React.useState<readonly number[]>();

    return (
        <BeautifulWrapper
            title="Row and Header sizes"
            description={
                <Description>
                    The row size can be controlled with <PropName>rowHeight</PropName> and the header size with{" "}
                    <PropName>headerHeight</PropName>.
                </Description>
            }>
            <DataEditor
                {...defaultProps}
                rowHeight={p.rowHeight}
                headerHeight={p.headerHeight}
                selectedRows={selectedRows}
                onSelectedRowsChange={setSelectedRows}
                rowMarkers={true}
                getCellContent={getCellContent}
                columns={cols}
                rows={1_000}
            />
        </BeautifulWrapper>
    );
};
(RowAndHeaderSizes as any).args = {
    rowHeight: 34,
    headerHeight: 34,
};
(RowAndHeaderSizes as any).argTypes = {
    rowHeight: {
        control: {
            type: "range",
            min: 20,
            max: 200,
        },
    },
    headerHeight: {
        control: {
            type: "range",
            min: 20,
            max: 200,
        },
    },
};
(RowAndHeaderSizes as any).parameters = {
    options: {
        showPanel: true,
    },
};

const KeyName = styled.kbd`
    background-color: #f4f4f4;
    color: #2b2b2b;
    padding: 2px 6px;
    font-family: monospace;
    font-size: 14px;
    border-radius: 4px;
    box-shadow: 0px 1px 2px #00000040;
    margin: 0 0.1em;
`;

function useKeyPressed(key: string): boolean {
    const [isPressed, setIsPressed] = React.useState(false);

    React.useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === key) {
                setIsPressed(true);
            }
        };

        const onKeyUp = (e: KeyboardEvent) => {
            if (e.key === key) {
                setIsPressed(false);
            }
        };

        document.addEventListener("keydown", onKeyDown);
        document.addEventListener("keyup", onKeyUp);

        return () => {
            document.removeEventListener("keydown", onKeyDown);
            document.removeEventListener("keyup", onKeyUp);
        };
    }, [key]);

    return isPressed;
}

export const MultiSelectColumns: React.VFC = () => {
    const { cols, getCellContent } = useMockDataGenerator(100);

    const isCmdPressed = useKeyPressed(browserIsOSX.value ? "Meta" : "Control");
    const [selectedColumns, setSelectedColumns] = React.useState<Set<number>>(new Set());

    const onSelectedColumnsChange = (newColumns: ColumnSelection | undefined) => {
        if (newColumns === undefined) {
            setSelectedColumns(new Set());
            return;
        }

        const [colIndex] = newColumns;
        if (isCmdPressed) {
            setSelectedColumns(prevSelection => {
                const newSet = new Set(prevSelection);

                if (prevSelection.has(colIndex)) {
                    newSet.delete(colIndex);
                } else {
                    newSet.add(colIndex);
                }

                return newSet;
            });
        } else {
            setSelectedColumns(new Set([colIndex]));
        }
    };

    return (
        <BeautifulWrapper
            title="Multi select columns"
            description={
                <>
                    <Description>
                        You can select multiple columns by using the <PropName>selectedColumns</PropName> and{" "}
                        <PropName>onSelectedColumnsChange</PropName> props
                    </Description>
                    <MoreInfo>
                        Here you can multi select columns by using <KeyName>Ctrl</KeyName> (on Windows) or{" "}
                        <KeyName>⌘</KeyName> (on Mac)
                    </MoreInfo>
                </>
            }>
            <DataEditor
                {...defaultProps}
                getCellContent={getCellContent}
                columns={cols}
                rows={100_000}
                selectedColumns={[...selectedColumns]}
                onSelectedColumnsChange={onSelectedColumnsChange}
            />
        </BeautifulWrapper>
    );
};

(MultiSelectColumns as any).parameters = {
    options: {
        showPanel: false,
    },
};
