// @refresh reload
import type { DocumentComponentProps } from "@solidjs/start/server";
import { createHandler, StartServer } from "@solidjs/start/server";
import { getRequestEvent } from "solid-js/web";

function Nonce() {
  const event = getRequestEvent();
  const nonce = event?.locals?.nonce;
  return nonce ? <meta name="x-nonce" content={nonce} /> : null;
}

export default createHandler(
  () => (
    <StartServer
      document={({ assets, children, scripts }: DocumentComponentProps) => (
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <Nonce />
            <title>Vulf</title>
            {assets}
          </head>
          <body>
            <div id="app">{children}</div>
            {scripts}
          </body>
        </html>
      )}
    />
  ),
  (event) => ({ mode: "async", nonce: event.locals.nonce }),
);
