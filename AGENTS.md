<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Customer dashboard phone presentation uses the existing dashboard layout and overview with `sm`-scoped variants; hide the shared storefront header and collapse footer links only for signed-in non-staff dashboard visits below `sm` to avoid redundant height while preserving other pages and desktop.
