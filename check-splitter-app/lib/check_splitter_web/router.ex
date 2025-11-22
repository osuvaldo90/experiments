defmodule CheckSplitterWeb.Router do
  use CheckSplitterWeb, :router

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, html: {CheckSplitterWeb.Layouts, :root}
    plug :protect_from_forgery
    plug :put_secure_browser_headers
  end

  scope "/", CheckSplitterWeb do
    pipe_through :browser

    live "/", HomeLive
    live "/new", NewCheckLive
    live "/check/:id", CheckLive
    live "/join", JoinLive
    live "/join/:share_code", JoinLive
  end
end
