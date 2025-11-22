defmodule CheckSplitterWeb.ErrorHTML do
  use CheckSplitterWeb, :html

  # If you want to customize your error pages,
  # uncomment the embed_templates/1 call below
  # and add pages to the error directory:
  #
  #   * lib/check_splitter_web/components/error/404.html.heex
  #   * lib/check_splitter_web/components/error/500.html.heex
  #
  # embed_templates "error/*"

  def render(template, _assigns) do
    Phoenix.Controller.status_message_from_template(template)
  end
end
