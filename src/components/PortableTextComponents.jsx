import imageUrlBuilder from '@sanity/image-url';
import sanityClient from '../sanityClient';

const imageBuilder = imageUrlBuilder(sanityClient);

const renderPortableTable = ({ value }) => {
  const rows = Array.isArray(value?.rows)
    ? value.rows.filter((row) => Array.isArray(row.cells))
    : [];
  if (!rows.length) return null;

  const [header, ...body] = rows;
  return (
    <div className="my-6 overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
      <table className="w-full min-w-max border-collapse text-left text-sm">
        <thead className="bg-blue-950 text-white">
          <tr>
            {header.cells.map((cell, index) => (
              <th
                key={`${header._key || 'header'}-${index}`}
                scope="col"
                className="border border-blue-900 px-4 py-3 font-bold"
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        {body.length > 0 && (
          <tbody>
            {body.map((row, rowIndex) => (
              <tr
                key={row._key || `row-${rowIndex}`}
                className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
              >
                {row.cells.map((cell, cellIndex) => (
                  <td
                    key={`${row._key || rowIndex}-${cellIndex}`}
                    className="border border-slate-200 px-4 py-3 align-top text-slate-700"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        )}
      </table>
    </div>
  );
};

const renderPortableImage = ({ value }) => {
  if (!value?.asset?._ref) return null;

  return (
    <figure className="my-6">
      <img
        src={imageBuilder.image(value).width(1600).auto('format').url()}
        alt={value.alt || ''}
        loading="lazy"
        decoding="async"
        className="mx-auto h-auto max-w-full rounded-xl object-contain"
      />
      {value.caption && (
        <figcaption className="mt-2 text-center text-sm text-slate-500">
          {value.caption}
        </figcaption>
      )}
    </figure>
  );
};

const portableTextComponents = {
  types: {
    table: renderPortableTable,
    image: renderPortableImage
  }
};

export default portableTextComponents;
